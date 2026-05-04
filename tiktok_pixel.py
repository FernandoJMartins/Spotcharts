import logging
import time
import hashlib
import requests
from datetime import datetime, timezone
from sqlalchemy import text
from src.utils.db_session import new_session
from src.models.payment import Payment
from src.models.codigo_venda import CodigoVenda
from .tracking_utils import get_tracking_unique_click_id

logger = logging.getLogger(__name__)


def hash_sha256(data):
    if not data:
        return None
    return hashlib.sha256(str(data).encode('utf-8')).hexdigest()


def send_tiktok_event(tracking_profile=None, event_name="Purchase", event_data=None, codigo_venda_id=None,
                      payment_id=None, is_test=False):
    """
    Envia evento para TikTok (server-side Events API).

    Args:
        tracking_profile: objeto TrackingProfile contendo `tiktok_pixel_id` e `tiktok_access_token`
        event_name: nome do evento
        event_data: dict com dados opcionais do evento
        codigo_venda_id/payment_id: ids para correlacionar
        is_test: marca o evento como teste (se suportado)
    """
    if not tracking_profile:
        logger.error("send_tiktok_event: tracking_profile ausente")
        return False

    pixel_id = getattr(tracking_profile, 'tiktok_pixel_id', None)
    access_token = getattr(tracking_profile, 'tiktok_access_token', None)
    test_code = getattr(tracking_profile, 'tiktok_test_event_code', None)
    pixel_name = getattr(tracking_profile, 'name', str(pixel_id))

    if not pixel_id or not access_token:
        logger.error(f"TikTok pixel or access token not configured for profile {pixel_name}")
        return False


    if event_data is None:
        event_data = {}

    # Try to fetch unique_click_id, recent frontend_utms (timestamp_ms) and payment
    utm_row = None
    unique_click_id = None
    payment = None
    try:
        with new_session() as session:
            try:
                unique_click_id = get_tracking_unique_click_id(session, codigo_venda_id, payment_id)
            except Exception:
                unique_click_id = None

            if not unique_click_id:
                unique_click_id = 'TEST-CLICK-ID-' + str(int(time.time()))

            q = text("""
                SELECT timestamp_ms, ttclid, ip, user_agent
                FROM frontend_utms
                WHERE unique_click_id = :uid
                ORDER BY received_at DESC
                LIMIT 1
            """)
            utm_row = session.execute(q, {"uid": unique_click_id}).fetchone()

            # load payment if provided
            if payment_id is not None:
                try:
                    payment = session.query(Payment).filter_by(id=payment_id).first()
                except Exception:
                    payment = None
    except Exception as e:
        logger.debug(f"TikTok: frontend_utms lookup failed: {e}")

    # Build payload following TikTok Events API shape (simplified)
    endpoint = "https://business-api.tiktok.com/open_api/v1.2/pixel/track/"

    # prefer event_time from DB if available (timestamp_ms stored in ms)
    if utm_row and getattr(utm_row, 'timestamp_ms', None):
        ts_ms = int(getattr(utm_row, 'timestamp_ms'))
        event_time_str = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat()
    else:
        ev = float(event_data.get('event_time', time.time()))
        event_time_str = datetime.fromtimestamp(ev, tz=timezone.utc).isoformat()

    distinct_id = event_data.get('distinct_id') or (f"ORDER-{payment_id}" if payment_id else f"CV-{codigo_venda_id}")

    # Build properties using payment when available (value, contents)
    value_amount = None
    if event_data.get('value') is not None:
        try:
            value_amount = float(event_data.get('value'))
        except Exception:
            value_amount = None

    if value_amount is None and payment and getattr(payment, 'amount', None) is not None:
        try:
            value_amount = float(payment.amount)
        except Exception:
            value_amount = 0.0

    if value_amount is None:
        value_amount = float(event_data.get('value', 0))

    contents_arr = []
    if payment and getattr(payment, 'id', None):
        contents_arr.append({
            'content_id': f"ORDER-{payment.id}",
            'quantity': 1,
            'price': float(payment.amount) if getattr(payment, 'amount', None) is not None else value_amount,
            'currency': event_data.get('currency', 'BRL')
        })

    # If no payment found, create a test payment when in test mode
    if not contents_arr and is_test:
        try:
            payment = Payment(id=999, amount=10)
            contents_arr.append({
                'content_id': f"TEST-{payment.id}",
                'quantity': 1,
                'price': float(payment.amount),
                'currency': event_data.get('currency', 'BRL')
            })
        except Exception:
            pass

    # As a last fallback, ensure at least one content_id using codigo_venda_id/payment_id/unique_click_id
    if not contents_arr:
        fallback_id = None
        if codigo_venda_id:
            fallback_id = f"CV-{codigo_venda_id}"
        elif payment_id:
            fallback_id = f"ORDER-{payment_id}"
        else:
            fallback_id = unique_click_id or f"CLICK-{int(time.time())}"
        contents_arr.append({
            'content_id': fallback_id,
            'quantity': 1,
            'price': value_amount,
            'currency': event_data.get('currency', 'BRL')
        })

    payload = {
        "pixel_code": pixel_id,
        "event": event_name,
        "timestamp": event_time_str,
        "event_id": unique_click_id,  # 👈 DEDUPE
    
        "context": {
            "ad": {
                "callback": getattr(utm_row, "ttclid", None)  # 👈 ESSENCIAL
            },
            "user": {
                "external_id": distinct_id,
                "ip": getattr(utm_row, "ip", None),
                "user_agent": getattr(utm_row, "user_agent", None)
            }
        },
        "contents": {
            "codigo_venda_id": codigo_venda_id,
            "payment_id": payment_id 
        },
    
        "properties": {
            "value": value_amount,
            "currency": event_data.get('currency', 'BRL'),
            "contents": contents_arr
        }
    }
    
    # add test_event_code only when requested and configured
    # if is_test and test_code:
    payload['test_event_code'] = test_code

    headers = {"Access-Token": access_token, "Content-Type": "application/json"}

    try:
        logger.info(f"TikTok Pixel endpoint: {endpoint} payload={payload}")
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        logger.info(f"TikTok response: {resp.status_code} {resp.text}")
        resp.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"TikTok event request failed: {e}; payload={payload}")
        return False
