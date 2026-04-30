import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const SafeImage = ({ src, alt, className, style }) => {
    const [isError, setIsError] = useState(false);
    if (isError || !src) {
        return (
            <div 
                className={`bg-light d-flex align-items-center justify-content-center text-muted ${className}`}
                style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}
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
            style={style}
            onError={() => setIsError(true)} 
        />
    );
};


export const Single = () => {
    const { store, dispatch } = useGlobalReducer();
    const { theId } = useParams();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/products/${theId}`);
            if (!response.ok) throw new Error("Producto no encontrado");
            const data = await response.json();
            setProduct(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllProducts = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/products`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: "set_products", payload: data });
            }
        } catch (err) {
            console.error("Error fetching related products:", err);
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchProduct();
        if (theId) {
            fetch(`${backendUrl}/api/products/${theId}/view`, {
                method: "POST"
            }).catch(err => console.error("Error logging view:", err));
        }
        if (!store.products || store.products.length === 0) {
            fetchAllProducts();
        }
    }, [theId]);


    const handleAddToCart = () => {
        if (!product) return;
        dispatch({ type: "add_to_cart", payload: product });
        
        fetch(`${backendUrl}/api/products/${theId}/sale`, {
            method: "POST"
        }).catch(err => console.error("Error logging sale:", err));
    };




    const getSimilarityScore = (p1, p2) => {
        let score = 0;
        
        // 1. Coincidencia de Categoría (Peso: 15 puntos)
        if (p1.category === p2.category) score += 15;
        
        // 2. Similitud de Texto (Jaccard sobre Nombre y Descripción)
        const getWords = (str) => {
            if (!str) return new Set();
            const stopWords = ["el", "la", "de", "para", "con", "en", "un", "una", "y", "o", "a", "los", "las", "un", "del", "al", "es", "son", "que"];
            return new Set(
                str.toLowerCase()
                   .replace(/[^\w\s]/g, "")
                   .split(/\s+/)
                   .filter(w => w.length > 2 && !stopWords.includes(w))
            );
        };

        const words1 = new Set([...getWords(p1.name), ...getWords(p1.description)]);
        const words2 = new Set([...getWords(p2.name), ...getWords(p2.description)]);
        
        let intersection = 0;
        words1.forEach(w => {
            if (words2.has(w)) intersection++;
        });
        
        const union = words1.size + words2.size - intersection;
        const jaccard = union > 0 ? (intersection / union) : 0;
        score += jaccard * 35; // Peso importante para textos parecidos
        
        // 3. Proximidad de Precio
        const priceDiff = Math.abs(p1.price - p2.price);
        const maxPrice = Math.max(p1.price, p2.price);
        if (maxPrice > 0) {
            const priceSimilarity = 1 - (priceDiff / maxPrice);
            score += priceSimilarity * 10; // Hasta 10 puntos por precios similares
        }
        
        return score;
    };

    const getRelatedProducts = () => {
        if (!product || !store.products) return [];
        return store.products
            .filter(p => p.id !== product.id)
            .map(p => ({ ...p, similarityScore: getSimilarityScore(product, p) }))
            .filter(p => p.similarityScore > 0)
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .slice(0, 4);
    };

    const relatedProducts = getRelatedProducts();

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="container py-5 text-center">
                <div className="alert alert-danger">{error || "Error al cargar el producto"}</div>
                <Link to="/" className="btn btn-custom-primary mt-3">
                    Volver a la Tienda
                </Link>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <Link to="/" className="btn btn-outline-secondary mb-4 d-inline-flex align-items-center gap-2">
                <i className="fas fa-arrow-left"></i> Volver a la Tienda
            </Link>

            <div className="row g-5 bg-white p-4 rounded-3 shadow-md">
                <div className="col-md-6">
                    <div className="product-detail-img-container rounded-3 overflow-hidden shadow-sm">
                        <SafeImage 
                            src={product.image_url} 
                            alt={product.name} 
                            className="img-fluid w-100"
                            style={{ objectFit: "cover", maxHeight: "500px" }}
                        />
                    </div>
                </div>
                
                <div className="col-md-6 d-flex flex-column justify-content-center">
                    <span className="badge bg-secondary text-white rounded-pill mb-2 px-3 py-2 align-self-start">
                        {product.category}
                    </span>
                    <h1 className="display-5 font-weight-bold text-dark mb-3">{product.name}</h1>
                    <p className="text-danger font-weight-bold display-6 mb-4">${new Intl.NumberFormat('es-CL').format(product.price)}</p>


                    
                    <div className="mb-4">
                        <h5 className="font-weight-bold text-dark">Descripción</h5>
                        <p className="text-muted" style={{ lineHeight: "1.8" }}>{product.description}</p>
                    </div>

                    <div className="d-flex align-items-center gap-3 mb-4">
                        <span className="text-muted">
                            <i className="fas fa-check-circle text-success me-1"></i> 
                            Stock disponible: <strong>{product.stock}</strong> unidades
                        </span>
                    </div>

                    <button 
                        className="btn btn-custom-primary btn-lg font-weight-bold w-100 py-3"
                        onClick={handleAddToCart}
                    >
                        <i className="fas fa-cart-plus me-2"></i>
                        Agregar al Carrito
                    </button>
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts && relatedProducts.length > 0 && (
                <div className="mt-5 pt-4">
                    <h3 className="font-weight-bold text-dark mb-4">
                        <i className="fas fa-magic text-primary me-2"></i> Productos Relacionados (Por relevancia)
                    </h3>
                    <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-4">
                        {relatedProducts.map((related) => (
                                <div key={related.id} className="col">
                                    <div className="card h-100 product-card shadow-sm border-0 glass overflow-hidden" style={{ transition: "all 0.3s ease", borderRadius: "15px" }}>
                                        <div className="product-img-container">
                                            <SafeImage 
                                                src={related.image_url} 
                                                alt={related.name} 
                                                className="product-img" 
                                            />
                                        </div>

                                        <div className="card-body p-3 d-flex flex-column">
                                            <span className="badge bg-light text-muted mb-2 align-self-start" style={{ fontSize: "0.8rem", borderRadius: "10px" }}>
                                                {related.category}
                                            </span>
                                            <h5 className="card-title font-weight-bold text-dark mb-1 text-truncate" title={related.name}>
                                                {related.name}
                                            </h5>
                                            <p className="card-text text-danger font-weight-bold mb-3">${new Intl.NumberFormat('es-CL').format(related.price)}</p>

                                            <Link 
                                                to={`/single/${related.id}`} 
                                                className="btn btn-custom-secondary w-100 mt-auto"
                                                onClick={() => window.scrollTo(0, 0)}
                                            >
                                                Ver Detalle
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};
