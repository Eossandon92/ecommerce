import os
import sys

# Add src directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from api.models import db, Category

with app.app_context():
    initial_categories = ["Ropa", "Juguetes", "Accesorios", "Libros"]
    print("Seeding categories...")
    for name in initial_categories:
        existing = Category.query.filter_by(name=name).first()
        if not existing:
            cat = Category(name=name)
            db.session.add(cat)
            print(f"Added category: {name}")
    db.session.commit()
    print("Done!")
