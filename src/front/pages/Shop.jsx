import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

const SafeImage = ({ src, alt, className }) => {
    const [isError, setIsError] = useState(false);
    if (isError || !src) {
        return (
            <div 
                className={`bg-light d-flex align-items-center justify-content-center text-muted ${className}`}
                style={{ height: "100%", position: "absolute", top: 0, left: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <i className="fas fa-image fa-2x"></i>
            </div>
        );
    }
    return (
        <img 
            src={src} 
            alt={alt} 
            className={className} 
            onError={() => setIsError(true)} 
        />
    );
};

export const Shop = () => {
    const { store, dispatch } = useGlobalReducer();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/products`);
            if (!response.ok) throw new Error("Error al cargar los productos");
            const data = await response.json();
            dispatch({ type: "set_products", payload: data });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/categories`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: "set_categories", payload: data });
            }
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const handleAddToCart = (product) => {
        dispatch({ type: "add_to_cart", payload: product });
        if (product && product.id) {
            fetch(`${backendUrl}/api/products/${product.id}/sale`, {
                method: "POST"
            }).catch(err => console.error("Error logging sale:", err));
        }
    };

    const filteredProducts = store.products ? store.products.filter(product => {
        const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             product.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    }) : [];

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h1 className="display-4 font-weight-bold text-dark">Nuestra Tienda</h1>
                <p className="lead text-muted">Encuentra los mejores juguetes y accesorios para tus pequeños exploradores.</p>
            </div>

            {/* Search and Filters */}
            <div className="row g-4 mb-5 align-items-center">
                <div className="col-lg-4">
                    <div className="input-group">
                        <input 
                            type="text" 
                            className="form-control form-control-custom" 
                            placeholder="¿Qué estás buscando hoy?" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="input-group-text bg-white border-left-0">
                            <i className="fas fa-search text-muted"></i>
                        </span>
                    </div>
                </div>
                <div className="col-lg-8">
                    <div className="d-flex justify-content-lg-end gap-2 flex-wrap">
                        <button 
                            className={`filter-btn ${selectedCategory === "Todos" ? "active" : ""}`}
                            onClick={() => setSelectedCategory("Todos")}
                        >
                            Todos
                        </button>
                        {store.categories && store.categories.map((cat) => (
                            <button 
                                key={cat.id}
                                className={`filter-btn ${selectedCategory === cat.name ? "active" : ""}`}
                                onClick={() => setSelectedCategory(cat.name)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="alert alert-danger text-center">{error}</div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-5 glass rounded-3">
                    <i className="fas fa-search fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No se encontraron productos en esta categoría.</p>
                </div>
            ) : (
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
                    {filteredProducts.map((product) => (
                        <div className="col" key={product.id}>
                            <div className="product-card">
                                <Link to={"/single/" + product.id}>
                                    <div className="product-img-container">
                                        <SafeImage 
                                            src={product.image_url} 
                                            alt={product.name} 
                                            className="product-img"
                                        />
                                    </div>
                                </Link>
                                <div className="product-body">
                                    <span className="product-category">{product.category}</span>
                                    <Link to={"/single/" + product.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <h5 className="product-title">{product.name}</h5>
                                    </Link>
                                    <p className="text-muted flex-grow-1" style={{ fontSize: "0.9rem" }}>
                                        {product.description.length > 80 
                                            ? `${product.description.substring(0, 80)}...` 
                                            : product.description}
                                    </p>
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <span className="product-price">${new Intl.NumberFormat('es-CL').format(product.price)}</span>
                                        <button 
                                            className="btn btn-custom-primary btn-sm"
                                            onClick={() => handleAddToCart(product)}
                                        >
                                            <i className="fas fa-cart-plus me-1"></i>
                                            Comprar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
