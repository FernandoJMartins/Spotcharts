from django.test import SimpleTestCase

from services.dashboard_service import (
    build_track_items,
    build_album_items_from_tracks,
    build_artist_items,
)


class DashboardServiceTest(SimpleTestCase):

    def test_build_track_items(self):
        tracks = [
            {
                "id": "t1",
                "name": "Track 1",
                "artists": [{"name": "Artist 1"}],
                "album": {"images": [{"url": "http://img1"}]},
                "popularity": 80,
                "uri": "spotify:track:t1",
            },
            {
                "id": "t2",
                "name": "Track 2",
                "artists": [{"name": "Artist 2"}],
                "album": {"images": []},
                "popularity": 70,
                "uri": "spotify:track:t2",
            },
        ]

        items = build_track_items(tracks)

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["name"], "Track 1")
        self.assertEqual(items[0]["rank"], 1)
        self.assertEqual(items[0]["image_url"], "http://img1")

        self.assertEqual(items[1]["rank"], 2)
        self.assertIsNone(items[1]["image_url"])

    def test_build_album_items_from_tracks(self):
        tracks = [
            {
                "popularity": 50,
                "album": {
                    "id": "a1",
                    "name": "Album 1",
                    "artists": [{"name": "Artist 1"}],
                    "images": [{"url": "http://img-a1"}],
                    "uri": "spotify:album:a1",
                },
            },
            {
                "popularity": 60,
                "album": {
                    "id": "a1",
                    "name": "Album 1",
                    "artists": [{"name": "Artist 1"}],
                    "images": [{"url": "http://img-a1"}],
                    "uri": "spotify:album:a1",
                },
            },
            {
                "popularity": 40,
                "album": {
                    "id": "a2",
                    "name": "Album 2",
                    "artists": [{"name": "Artist 2"}],
                    "images": [{"url": "http://img-a2"}],
                    "uri": "spotify:album:a2",
                },
            },
        ]

        items = build_album_items_from_tracks(tracks)

        self.assertEqual(len(items), 2)

        # Album 1: 50 + 60 = 110
        self.assertEqual(items[0]["id"], "a1")
        self.assertEqual(items[0]["plays"], 110)
        self.assertEqual(items[0]["rank"], 1)

        self.assertEqual(items[1]["id"], "a2")
        self.assertEqual(items[1]["plays"], 40)
        self.assertEqual(items[1]["rank"], 2)

    def test_build_artist_items(self):
        artists = [
            {
                "id": "ar1",
                "name": "Artist 1",
                "images": [{"url": "http://img-ar1"}],
                "popularity": 90,
                "uri": "spotify:artist:ar1",
            }
        ]

        items = build_artist_items(artists)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["name"], "Artist 1")
        self.assertEqual(items[0]["rank"], 1)
        self.assertEqual(items[0]["artists"], ["Artist 1"])
