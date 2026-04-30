import urllib.request
import urllib.parse
import re

def search_image_bing(query):
    query_encoded = urllib.parse.quote(query)
    url = f"https://www.bing.com/images/search?q={query_encoded}"
    
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    )
    
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Bing stores image URLs in JSON structures with the key "murl"
        img_urls = re.findall(r'"murl":"(https://[^"]+\.(?:jpg|png|jpeg)[^"]*)"', html)
        
        if img_urls:
            return img_urls[0]
            
        return None
    except Exception as e:
        print(f"Error scraping Bing: {e}")
        return None

if __name__ == "__main__":
    test_query = "oso de peluche juguete"
    img = search_image_bing(test_query)
    print(f"Found Bing image: {img}")
