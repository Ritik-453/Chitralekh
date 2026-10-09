import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as c:
        r = await c.get('http://localhost:8000/health')
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")

asyncio.run(test())