import os
import sys

# Add src directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from api.models import db, Category, Product

with app.app_context():
    print("Clearing existing products and categories...")
    Product.query.delete()
    Category.query.delete()
    db.session.commit()

    toy_categories = [
        "Didácticos", 
        "Peluches", 
        "Vehículos", 
        "Muñecas y Figuras", 
        "Juegos de Mesa", 
        "Aire Libre"
    ]
    
    print("Seeding toy categories...")
    for cat_name in toy_categories:
        db.session.add(Category(name=cat_name))
    db.session.commit()

    toys_data = [
        # DIDÁCTICOS
        {
            "name": "Bloques de Madera 100 Piezas",
            "description": "Set de bloques de madera natural de colores. Ideal para desarrollar la motricidad fina y la imaginación.",
            "price": 18990,
            "category": "Didácticos",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Banco de Herramientas Infantil",
            "description": "Caja y herramientas de madera (martillo, destornillador, tuercas). Para pequeños constructores.",
            "price": 15990,
            "category": "Didácticos",
            "stock": 15,
            "image_url": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Set de Encaje Geométrico",
            "description": "Base de madera con postes para encajar figuras geométricas por color y forma.",
            "price": 9990,
            "category": "Didácticos",
            "stock": 30,
            "image_url": "https://images.unsplash.com/photo-1618842676088-c4d48a6a7c9d?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Ábaco de Madera Tradicional",
            "description": "Ábaco clásico de 10 filas de cuentas de colores. Perfecto para aprender a contar.",
            "price": 11990,
            "category": "Didácticos",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Pizarra Magnética 2 en 1",
            "description": "Por un lado tiza, por el otro plumón magnético. Incluye letras y números imantados.",
            "price": 22990,
            "category": "Didácticos",
            "stock": 12,
            "image_url": "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=500&auto=format&fit=crop"
        },

        # PELUCHES
        {
            "name": "Oso de Peluche Gigante",
            "description": "Oso de peluche café de 100 cm de altura. Suave, esponjoso y súper tierno.",
            "price": 34990,
            "category": "Peluches",
            "stock": 10,
            "image_url": "https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Unicornio de Felpa Mágico",
            "description": "Lindo unicornio blanco con detalles brillantes y alas doradas de peluche.",
            "price": 14990,
            "category": "Peluches",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1534349762230-e0cadf78f5ea?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Dinosaurio T-Rex de Felpa",
            "description": "Peluches de dinosaurio verde suave de 40 cm. Amigable y no asusta.",
            "price": 12990,
            "category": "Peluches",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1562040506-a9b32cb51b94?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Perrito de Peluche con Sonido",
            "description": "Pequeño cachorro de peluche que ladra al presionar su pancita. Incluye correa.",
            "price": 16990,
            "category": "Peluches",
            "stock": 15,
            "image_url": "https://images.unsplash.com/photo-1556012018-54950ad790a3?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Almohada Elefante para Bebé",
            "description": "Peluche de elefante gigante diseñado para dar soporte y comodidad al bebé.",
            "price": 19990,
            "category": "Peluches",
            "stock": 18,
            "image_url": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=500&auto=format&fit=crop"
        },

        # VEHÍCULOS
        {
            "name": "Auto Todoterreno 4x4 RC",
            "description": "Vehículo a control remoto para todo tipo de terrenos. Batería recargable USB.",
            "price": 29990,
            "category": "Vehículos",
            "stock": 8,
            "image_url": "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Camión de Bomberos con Luces",
            "description": "Camión con sirena real, luces intermitentes y escalera extensible manual.",
            "price": 17990,
            "category": "Vehículos",
            "stock": 14,
            "image_url": "https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Tren de Madera con Vías",
            "description": "Set de tren con locomotora, vagones y circuito de rieles de madera intercambiables.",
            "price": 24990,
            "category": "Vehículos",
            "stock": 11,
            "image_url": "https://images.unsplash.com/photo-1515488042361-404e92537a2a?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Helicóptero de Rescate",
            "description": "Helicóptero de juguete con hélices giratorias y camilla de rescate incluida.",
            "price": 13990,
            "category": "Vehículos",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Pista de Carreras Eléctrica",
            "description": "Circuito de carreras en forma de 8 con dos autos de alta velocidad incluidos.",
            "price": 39990,
            "category": "Vehículos",
            "stock": 6,
            "image_url": "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=500&auto=format&fit=crop"
        },

        # MUÑECAS Y FIGURAS
        {
            "name": "Muñeca Bebé Interactiva",
            "description": "Muñeca que toma mamadera y moja el pañal. Viene con accesorios de alimentación.",
            "price": 21990,
            "category": "Muñecas y Figuras",
            "stock": 16,
            "image_url": "https://images.unsplash.com/photo-1515488723429-ca0042ec76fc?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Castillo de Princesas",
            "description": "Castillo armable portátil con figuritas de príncipe y princesa incluidas.",
            "price": 25990,
            "category": "Muñecas y Figuras",
            "stock": 12,
            "image_url": "https://images.unsplash.com/photo-1621452773781-0f992fd1f5cb?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Set de Dinosaurios 12 pcs",
            "description": "Colección de diferentes especies de dinosaurios de goma resistente y detallada.",
            "price": 14990,
            "category": "Muñecas y Figuras",
            "stock": 22,
            "image_url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Figuras de Acción Héroes",
            "description": "Pack de 4 superhéroes articulados de 30 cm de altura.",
            "price": 19990,
            "category": "Muñecas y Figuras",
            "stock": 15,
            "image_url": "https://images.unsplash.com/photo-1608889175123-8ee36ce225f4?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Casa de Muñecas 3 Pisos",
            "description": "Mansión para muñecas hecha de madera, completamente amoblada.",
            "price": 69990,
            "category": "Muñecas y Figuras",
            "stock": 4,
            "image_url": "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=500&auto=format&fit=crop"
        },

        # JUEGOS DE MESA
        {
            "name": "Mi Primer Monopolio Kids",
            "description": "La versión adaptada y simplificada del clásico juego para niños.",
            "price": 14990,
            "category": "Juegos de Mesa",
            "stock": 18,
            "image_url": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Jenga de Madera Colores",
            "description": "Torre tambaleante de bloques de madera de colores con dado de juego.",
            "price": 10990,
            "category": "Juegos de Mesa",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1611891404910-50bcb34841af?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Juego de Memoria Animales",
            "description": "Cartas gruesas ilustradas para ejercitar la memoria de los más pequeños.",
            "price": 6990,
            "category": "Juegos de Mesa",
            "stock": 35,
            "image_url": "https://images.unsplash.com/photo-1618842676088-c4d48a6a7c9d?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Bingo Infantil Ilustrado",
            "description": "Bingo divertido con tómbola y cartones de objetos cotidianos.",
            "price": 9990,
            "category": "Juegos de Mesa",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Dominó Gigante de Espuma",
            "description": "Piezas de dominó suaves y de gran tamaño para jugar en el piso.",
            "price": 12990,
            "category": "Juegos de Mesa",
            "stock": 16,
            "image_url": "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=500&auto=format&fit=crop"
        },

        # AIRE LIBRE
        {
            "name": "Cama Elástica Infantil",
            "description": "Trampolín de 1.4 metros con red de seguridad reforzada. Uso interior o exterior.",
            "price": 49990,
            "category": "Aire Libre",
            "stock": 5,
            "image_url": "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Piscina de Pelotas",
            "description": "Corral plegable tipo piscina con 100 pelotas plásticas suaves incluidas.",
            "price": 19990,
            "category": "Aire Libre",
            "stock": 14,
            "image_url": "https://images.unsplash.com/photo-1515488042361-404e92537a2a?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Scooter de 3 Ruedas",
            "description": "Scooter infantil con ruedas LED que brillan al girar. Altura ajustable.",
            "price": 24990,
            "category": "Aire Libre",
            "stock": 12,
            "image_url": "https://images.unsplash.com/photo-1513673018143-0ba11556b532?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Arco de Fútbol Inflable",
            "description": "Arco de fútbol para jardín de fácil inflado. Incluye bombín y mini pelota.",
            "price": 11990,
            "category": "Aire Libre",
            "stock": 25,
            "image_url": "https://images.unsplash.com/photo-1614632537190-23e414d4094a?q=80&w=500&auto=format&fit=crop"
        },
        {
            "name": "Set de Arena Mágica",
            "description": "3 kg de arena kinética moldeable que nunca se seca. Incluye baldes y moldes.",
            "price": 13990,
            "category": "Aire Libre",
            "stock": 20,
            "image_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=500&auto=format&fit=crop"
        }
    ]

    print("Reseeding with 30 high-quality toys...")
    for toy in toys_data:
        p = Product(**toy)
        db.session.add(p)
    
    db.session.commit()
    print("RESUCCESS!")
