"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Product, Category, Banner

from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import json


api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

@api.route('/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([p.serialize() for p in products]), 200

@api.route('/products/<int:id>', methods=['GET'])
def get_product(id):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.serialize()), 200

@api.route('/products', methods=['POST'])
def create_product():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    required_fields = ['name', 'description', 'price', 'category']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
            
    product = Product(
        name=data['name'],
        description=data['description'],
        price=float(data['price']),
        image_url=data.get('image_url', ''),

        category=data['category'],
        stock=data.get('stock', 10)
    )
    
    db.session.add(product)
    db.session.commit()
    return jsonify(product.serialize()), 201

@api.route('/products/<int:id>', methods=['GET'])
def get_single_product(id):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.serialize()), 200

@api.route('/products/<int:id>', methods=['PUT'])

def update_product(id):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
        
    data = request.json
    if not data:
        return jsonify({"error": "Invalid data"}), 400
        
    if 'name' in data: product.name = data['name']
    if 'description' in data: product.description = data['description']
    if 'price' in data: product.price = float(data['price'])
    if 'image_url' in data: product.image_url = data['image_url']
    if 'category' in data: product.category = data['category']
    if 'stock' in data: product.stock = int(data['stock'])
    
    db.session.commit()
    return jsonify(product.serialize()), 200

@api.route('/products/<int:id>/view', methods=['POST'])
def view_product(id):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.views = (product.views or 0) + 1
    db.session.commit()
    return jsonify(product.serialize()), 200

@api.route('/products/<int:id>/sale', methods=['POST'])
def sale_product(id):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.sales = (product.sales or 0) + 1
    if product.stock > 0:
        product.stock -= 1
    db.session.commit()
    return jsonify(product.serialize()), 200

@api.route('/products/<int:id>', methods=['DELETE'])

def delete_product(id):
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
        
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 200

@api.route('/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([c.serialize() for c in categories]), 200

@api.route('/categories', methods=['POST'])
def create_category():
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Missing category name"}), 400
        
    existing = Category.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({"error": "Category already exists"}), 400
        
    category = Category(name=data['name'])
    db.session.add(category)
    db.session.commit()
    return jsonify(category.serialize()), 201

@api.route('/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    category = db.session.get(Category, id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
        
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200


def fetch_image_for_product(product_name):
    """Helper function to scrape Bing for an image URL based on a product name."""
    try:
        search_query = product_name
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
        formatted_query = search_query.replace(' ', '+')
        url = f"https://www.bing.com/images/search?q={formatted_query}"
        
        res = requests.get(url, headers=headers)
        if res.ok:
            soup = BeautifulSoup(res.text, 'html.parser')
            a_tags = soup.find_all('a', class_='iusc')
            for a in a_tags:
                m_data = a.get('m')
                if m_data:
                    try:
                        data = json.loads(m_data)
                        image_url = data.get('turl')
                        if image_url:
                            return image_url
                    except:
                        pass
                        
        return f"https://placehold.co/512x512?text={formatted_query}"
    except Exception as e:
        print(f"Error scraping image for {product_name}:", e)
        return "https://placehold.co/512x512?text=Error"


@api.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.json
    if not data or 'product_name' not in data:
        return jsonify({"error": "Missing product_name"}), 400
        
    try:
        product_name = data['product_name']
        product_description = data.get('product_description', '')
        
        # Al final, usar solo el nombre del producto + 'juguete' evita traer planos técnicos por la descripción
        search_query = f"{product_name} juguete".strip()
        
        image_url = fetch_image_for_product(search_query)
        if image_url == "https://placehold.co/512x512?text=Error":
            return jsonify({"error": "Error en servidor", "image_url": image_url}), 500
        elif image_url.startswith("https://placehold.co"):
            return jsonify({"error": "No se encontraron imágenes", "image_url": image_url}), 200
        else:
            return jsonify({"image_url": image_url}), 200
            
    except Exception as e:
        print("Error generating image:", e)
        return jsonify({"error": "Error communicating with service"}), 500


@api.route('/banners', methods=['GET'])
def get_banners():
    banners = Banner.query.all()
    return jsonify([b.serialize() for b in banners]), 200

@api.route('/banners', methods=['POST'])
def create_banner():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    banner = Banner(
        title=data.get('title', ''),
        subtitle=data.get('subtitle', ''),
        image_url=data.get('image_url', ''),
        button_text=data.get('button_text', 'Ver Productos'),
        link=data.get('link', '/shop')
    )
    db.session.add(banner)
    db.session.commit()
    return jsonify(banner.serialize()), 201

@api.route('/banners/<int:id>', methods=['PUT'])
def update_banner(id):
    banner = db.session.get(Banner, id)
    if not banner:
        return jsonify({"error": "Banner not found"}), 404
        
    data = request.json
    if not data:
        return jsonify({"error": "Invalid data"}), 400
        
    if 'title' in data: banner.title = data['title']
    if 'subtitle' in data: banner.subtitle = data['subtitle']
    if 'image_url' in data: banner.image_url = data['image_url']
    if 'button_text' in data: banner.button_text = data['button_text']
    if 'link' in data: banner.link = data['link']
    
    db.session.commit()
    return jsonify(banner.serialize()), 200

@api.route('/banners/<int:id>', methods=['DELETE'])
def delete_banner(id):
    banner = db.session.get(Banner, id)
    if not banner:
        return jsonify({"error": "Banner not found"}), 404
        
    db.session.delete(banner)
    db.session.commit()
    return jsonify({"message": "Banner deleted successfully"}), 200



