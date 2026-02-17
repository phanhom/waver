#!/usr/bin/env python3
import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.netease import NeteaseService

async def test_lyrics():
    service = NeteaseService()

    # Test with a known song ID (e.g., "夜曲" by 周杰伦)
    song_id = "33894312"

    print(f"Testing lyrics API for song ID: {song_id}")
    result = await service.get_lyrics(song_id)

    print("API Response:")
    print(f"Status Code: {result.get('code')}")
    print(f"Message: {result.get('message')}")

    if result.get('code') == 200:
        print("\nLyrics data received:")
        if 'lrc' in result and result['lrc']:
            print("Has regular lyrics (lrc)")
        if 'lyric' in result and result['lyric']:
            print("Has word-by-word lyrics (lyric)")
            print("Sample lyric data:")
            lines = result['lyric'].split('\n')[:3]
            for line in lines:
                print(f"  {line}")
        if 'tlyric' in result and result['tlyric']:
            print("Has translation lyrics (tlyric)")
    else:
        print("Failed to get lyrics")

if __name__ == "__main__":
    asyncio.run(test_lyrics())
