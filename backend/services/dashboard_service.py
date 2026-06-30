from typing import Any, Dict, List, Optional
from collections import defaultdict


def _get_image_url(images: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    for image in images or []:
        url = image.get("url")
        if url:
            return url
    return None


def build_genre_items(artists: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    genre_counts: Dict[str, int] = defaultdict(int)

    for artist in artists:
        for genre in artist.get("genres", []):
            genre_counts[genre] += 1

    items = []
    print(items)
    for genre, count in genre_counts.items():
        items.append(
            {
                "id": genre.lower().replace(" ", "-").replace("&", "and"),
                "name": genre,
                "artists": [],
                "image_url": None,
                "plays": count,
                "uri": None,
                "type": "genre",
            }
        )

    items.sort(
        key=lambda item: (item.get("plays", 0), item.get("name") or ""),
        reverse=True,
    )

    for index, item in enumerate(items):
        item["rank"] = index + 1
    safe_items = []
    print(items)
    for item in items:
        safe_items.append({
            "id": str(item.get("id") or ""),
            "name": str(item.get("name") or ""),
            "artists": list(item.get("artists") or []),
            "image_url": item.get("image_url") or None,
            "plays": int(item.get("plays") or 0),
            "uri": str(item.get("uri") or ""),
            "type": str(item.get("type") or "genre"),
            "rank": int(item.get("rank") or 0),
        })
    print(safe_items)
    return safe_items
from typing import Any, Dict, List, Optional


def build_mood_items(
    tracks: List[Dict[str, Any]],
    audio_features: List[Optional[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """
    Retorna uma lista de "moods" baseada nos atributos de áudio das tracks.

    Argumentos:
        tracks: Lista de tracks (cada uma com campo 'id').
        audio_features: Lista de features retornadas pelo Spotify (pode conter None).

    Retorno:
        Lista de dicionários com id, name, value (percentual), type e rank.
        Ordenada do maior valor para o menor.
    """
    # Mapeamento dos nomes das features para exibição
    mood_mapping = {
        "danceability": "Dançante",
        "energy": "Energético",
        "valence": "Feliz/Positivo",
        "acousticness": "Acústico",
        "instrumentalness": "Instrumental",
        "speechiness": "Falado",
    }

    # Filtra apenas features válidas (não None) e que correspondem a tracks existentes
    valid_features = [
        f for f in audio_features
        if f is not None and isinstance(f, dict)
    ]

    # Se não houver features válidas, retorna lista vazia
    if not valid_features:
        return []

    # Inicializa acumuladores
    sums = {key: 0.0 for key in mood_mapping}
    count = len(valid_features)

    # Soma os valores de cada feature
    for feature in valid_features:
        for key in mood_mapping:
            # O Spotify retorna valores entre 0 e 1
            sums[key] += feature.get(key, 0.0)

    # Calcula médias e constrói os itens
    items = []
    for key, total in sums.items():
        avg = total / count
        items.append({
            "id": key,
            "name": mood_mapping[key],
            "value": round(avg * 100),  # Percentual
            "type": "mood",
            "rank": 0,                  # será preenchido depois
        })

    # Ordena do maior valor para o menor
    items.sort(key=lambda x: -x["value"])

    # Atribui o rank
    for idx, item in enumerate(items, start=1):
        item["rank"] = idx

    return items

def build_track_items(
    tracks: List[Dict[str, Any]], offset: int = 0
) -> List[Dict[str, Any]]:
    items = []

    for index, track in enumerate(tracks):
        album = track.get("album") or {}
        external_urls = track.get("external_urls") or {}
        print(f"Processing track: {track.get('name')}, album: {album.get('name')}")
        items.append(
            {
                "id": track.get("id"),
                "name": track.get("name"),
                "artists": [artist.get("name") for artist in track.get("artists", [])],
                "image_url": _get_image_url(album.get("images")),
                "album": {
                    "id": album.get("id"),
                    "name": album.get("name"),
                    "uri": album.get("uri"),
                    "release_date": album.get("release_date"),
                    "release_date_precision": album.get("release_date_precision"),
                },
                "duration_ms": track.get("duration_ms"),
                "explicit": bool(track.get("explicit")),
                "preview_url": track.get("preview_url"),
                "track_number": track.get("track_number"),
                "disc_number": track.get("disc_number"),
                # Spotify does not expose play counts here, so we use popularity.
                "plays": track.get("popularity") or 0,
                "uri": track.get("uri"),
                "spotify_url": external_urls.get("spotify"),
                "external_ids": track.get("external_ids") or {},
                "is_local": bool(track.get("is_local")),
                "type": "track",
                "rank": offset + index + 1,
            }
        )

    return items


def build_album_items_from_tracks(tracks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    albums: Dict[str, Dict[str, Any]] = {}

    for track in tracks:
        album = track.get("album") or {}
        album_id = album.get("id")

        if not album_id:
            continue

        image_url = _get_image_url(album.get("images"))

        if album_id not in albums:
            albums[album_id] = {
                "id": album_id,
                "name": album.get("name"),
                "artists": [artist.get("name") for artist in album.get("artists", [])],
                "image_url": image_url,
                "plays": 0,
                "uri": album.get("uri"),
                "type": "album",
                "_track_count": 0,
            }

        albums[album_id]["plays"] += track.get("popularity") or 0
        albums[album_id]["_track_count"] += 1

        if not albums[album_id]["image_url"] and image_url:
            albums[album_id]["image_url"] = image_url

    items = list(albums.values())

    items.sort(
        key=lambda item: (
            item.get("plays", 0),
            item.get("_track_count", 0),
            item.get("name") or "",
        ),
        reverse=True,
    )

    for index, item in enumerate(items):
        item.pop("_track_count", None)
        item["rank"] = index + 1

    return items


def build_artist_items(
    artists: List[Dict[str, Any]], offset: int = 0
) -> List[Dict[str, Any]]:
    items = []

    for index, artist in enumerate(artists):
        items.append(
            {
                "id": artist.get("id"),
                "name": artist.get("name"),
                "artists": [artist.get("name")],  # For consistency with tracks/albums
                "image_url": _get_image_url(artist.get("images")),
                "plays": artist.get("popularity") or 0,
                "uri": artist.get("uri"),
                "type": "artist",
                "rank": offset + index + 1,
            }
        )

    return items
