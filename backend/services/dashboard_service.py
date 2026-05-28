from typing import Any, Dict, List, Optional


def _get_image_url(images: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    for image in images or []:
        url = image.get("url")
        if url:
            return url
    return None


def build_track_items(tracks: List[Dict[str, Any]], offset: int = 0) -> List[Dict[str, Any]]:
    items = []

    for index, track in enumerate(tracks):
        album = track.get("album") or {}
        items.append({
            "id": track.get("id"),
            "name": track.get("name"),
            "artists": [
                artist.get("name")
                for artist in track.get("artists", [])
            ],
            "image_url": _get_image_url(album.get("images")),
            # Spotify does not expose play counts here, so we use popularity.
            "plays": track.get("popularity") or 0,
            "uri": track.get("uri"),
            "type": "track",
            "rank": offset + index + 1,
        })

    return items


def build_album_items_from_tracks(
    tracks: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
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
                "artists": [
                    artist.get("name")
                    for artist in album.get("artists", [])
                ],
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
