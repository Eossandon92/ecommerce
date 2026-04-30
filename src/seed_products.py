import os
import sys
import random

# Add src directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from api.models import db, Product

with app.app_context():
    print("Clearing existing products...")
    Product.query.delete()
    db.session.commit()

    products_data = [
        # ROPA
        {
            "name": "Conjunto de Algodón Bebé",
            "description": "Suave conjunto de algodón orgánico para bebé de 0 a 12 meses. Incluye body y pantalón.",
            "price": 14990,
            "category": "Ropa",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Zapatillas Deportivas Infantiles",
            "description": "Zapatillas cómodas con velcro para niños. Ideales para correr y jugar.",
            "price": 24990,
            "category": "Ropa",
            "stock": 15,
            "image_url": "https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Vestido de Fiesta Floral",
            "description": "Hermoso vestido de fiesta para niña con estampado floral. Perfecto para celebraciones.",
            "price": 19990,
            "category": "Ropa",
            "stock": 10,
            "image_url": "https://images.unsplash.com/photo-1621452773781-0f992fd1f5cb?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Chaqueta Impermeable",
            "description": "Chaqueta con forro térmico para proteger del frío y la lluvia. Tallas 4 a 10.",
            "price": 29990,
            "category": "Ropa",
            "stock": 12,
            "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Pijama de Dinosaurio",
            "description": "Pijama enterito de polar súper calentito. Tiene diseño de dinosaurio con capucha.",
            "price": 16990,
            "category": "Ropa",
            "stock": 30,
            "image_url": "https://images.unsplash.com/photo-1515488042361-404e92537a2a?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Polerón con Capucha Kids",
            "description": "Polerón básico de algodón con capucha y bolsillo canguro. Muy abrigador.",
            "price": 12990,
            "category": "Ropa",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Jeans Clásicos Niños",
            "description": "Pantalón de mezclilla resistente con cintura elástica ajustable. Tallas 2 a 12.",
            "price": 15990,
            "category": "Ropa",
            "stock": 18,
            "image_url": "https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Pack de Calcetines Animados",
            "description": "Pack de 5 pares de calcetines de algodón con divertidos diseños de animalitos.",
            "price": 5990,
            "category": "Ropa",
            "stock": 50,
            "image_url": "https://images.unsplash.com/photo-1541560052-5e137f229371?q=80&w=500&auto=format&fit=crop"
        },

        # JUGUETES
        {
            "name": "Oso de Peluche Gigante",
            "description": "Oso de peluche de 1 metro de alto. Súper suave y tierno para abrazar.",
            "price": 34990,
            "category": "Juguetes",
            "stock": 8,
            "image_url": "https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Bloques de Construcción",
            "description": "Set de 100 bloques de madera de colores. Fomenta la creatividad y motricidad.",
            "price": 18990,
            "category": "Juguetes",
            "stock": 15,
            "image_url": "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Auto a Control Remoto",
            "description": "Auto todoterreno a batería. Alta velocidad y control de largo alcance.",
            "price": 27990,
            "category": "Juguetes",
            "stock": 10,
            "image_url": "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Muñeca Interactiva",
            "description": "Muñeca que habla, ríe y parpadea. Incluye mamadera y accesorios de cuidado.",
            "price": 22990,
            "category": "Juguetes",
            "stock": 14,
            "image_url": "https://images.unsplash.com/photo-1556012018-54950ad790a3?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Rompecabezas del Sistema Solar",
            "description": "Rompecabezas de 100 piezas grandes con efecto brillante en la oscuridad.",
            "price": 9990,
            "category": "Juguetes",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1618842676088-c4d48a6a7c9d?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Cocina de Juguete de Madera",
            "description": "Hermosa cocinita de madera equipada con ollas, sartenes y utensilios básicos.",
            "price": 59990,
            "category": "Juguetes",
            "stock": 5,
            "image_url": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Set de Arte y Pintura",
            "description": "Maletín con lápices de colores, acuarelas, pinceles y blocks de dibujo.",
            "price": 14990,
            "category": "Juguetes",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Pelota de Fútbol Infantil",
            "description": "Pelota de fútbol tamaño número 3, ideal para pequeños futbolistas en formación.",
            "price": 8990,
            "category": "Juguetes",
            "stock": 35,
            "image_url": "https://images.unsplash.com/photo-1614632537190-23e414d4094a?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Tren de Madera con Vías",
            "description": "Circuito de tren de madera con puentes, árboles y vagones magnéticos.",
            "price": 25990,
            "category": "Juguetes",
            "stock": 11,
            "image_url": "https://images.unsplash.com/photo-1515488042361-404e92537a2a?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Juego de Mesa Familiar",
            "description": "Divertido juego de estrategia simple para niños mayores de 5 años y sus papás.",
            "price": 13990,
            "category": "Juguetes",
            "stock": 22,
            "image_url": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=500&auto=format&fit=crop"
        },

        # ACCESORIOS
        {
            "name": "Mochila Escolar Animada",
            "description": "Mochila con diseño 3D de animalito. Correas acolchadas y múltiples bolsillos.",
            "price": 17990,
            "category": "Accesorios",
            "stock": 16,
            "image_url": "https://images.unsplash.com/photo-1553062407-98eeb94c6a62?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Botella de Agua Antiderrames",
            "description": "Termo de acero inoxidable que mantiene el agua fría por 12 horas. 400ml.",
            "price": 11990,
            "category": "Accesorios",
            "stock": 30,
            "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Chupetes Ergonómicos x2",
            "description": "Pack de dos chupetes anatómicos de silicona libres de BPA para bebés.",
            "price": 6990,
            "category": "Accesorios",
            "stock": 40,
            "image_url": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Mordedor de Silicona Fría",
            "description": "Mordedor con textura que calma las encías del bebé. Se puede enfriar en el refrigerador.",
            "price": 4990,
            "category": "Accesorios",
            "stock": 28,
            "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Lentes de Sol Flexibles",
            "description": "Lentes con filtro UV400 y marco de goma flexible irrompible para niños.",
            "price": 7990,
            "category": "Accesorios",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1513673018143-0ba11556b532?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Baberos Impermeables x3",
            "description": "Pack de baberos con bolsillo recolector para evitar manchas de comida.",
            "price": 8990,
            "category": "Accesorios",
            "stock": 32,
            "image_url": "https://images.unsplash.com/photo-1599021456807-25db0f974333?q=80&w=500&auto=format&fit=crop"
        },

        # LIBROS
        {
            "name": "El Principito Ilustrado",
            "description": "La clásica historia de Antoine de Saint-Exupéry adaptada con hermosas ilustraciones.",
            "price": 12990,
            "category": "Libros",
            "stock": 15,
            "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Cuentos para Dormir",
            "description": "Colección de historias cortas y tranquilas para leerle a los niños antes de dormir.",
            "price": 9990,
            "category": "Libros",
            "stock": 24,
            "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Libro de Colorear Gigante",
            "description": "Libro de 100 páginas con dibujos grandes de animales y escenas mágicas.",
            "price": 5990,
            "category": "Libros",
            "stock": 40,
            "image_url": "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Atlas del Mundo Ilustrado",
            "description": "Libro educativo con mapas coloridos y datos curiosos sobre todos los países.",
            "price": 15990,
            "category": "Libros",
            "stock": 10,
            "image_url": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Mi Primer Libro de Ciencias",
            "description": "Experimentos sencillos y explicaciones de la naturaleza para pequeños científicos.",
            "price": 11990,
            "category": "Libros",
            "stock": 18,
            "image_url": "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Fábulas de Esopo",
            "description": "Historias clásicas con enseñanzas morales adaptadas para la comprensión infantil.",
            "price": 8990,
            "category": "Libros",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=500&auto=format&fit=crop"
        }
    ]

    print("Adding 30 products...")
    for p_data in products_data:
        p = Product(**p_data)
        db.session.add(p)
    
    db.session.commit()
    print("Seeding successful!")
