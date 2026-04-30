import React from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;


    // Calculate total items in cart
    const totalItems = store.cart ? store.cart.reduce((acc, item) => acc + item.quantity, 0) : 0;

    // Calculate total price
    const totalPrice = store.cart ? new Intl.NumberFormat('es-CL').format(store.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)) : "0";


    const handleRemoveFromCart = (id) => {
        dispatch({ type: "remove_from_cart", payload: id });
    };

    const handleUpdateQuantity = (id, quantity) => {
        if (quantity <= 0) {
            dispatch({ type: "remove_from_cart", payload: id });
        } else {
            dispatch({ type: "update_cart_quantity", payload: { id, quantity } });
        }
    };

    return (
        <>
            <nav className="navbar navbar-expand-lg custom-navbar sticky-top">
                <div className="container">
                    <Link to="/" className="navbar-brand navbar-brand-custom">
                        <i className="fas fa-shapes me-2"></i>
                        <span>Pequeños Exploradores</span>
                    </Link>
                    
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto align-items-center gap-3">
                            <li className="nav-item">
                                <Link to="/" className="nav-link font-weight-bold text-dark">
                                    <i className="fas fa-home me-1"></i> Inicio
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/shop" className="nav-link font-weight-bold text-dark">
                                    <i className="fas fa-shopping-bag me-1"></i> Tienda
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin" className="nav-link font-weight-bold text-dark">
                                    <i className="fas fa-tools me-1"></i> Panel Admin
                                </Link>
                            </li>

                            <li className="nav-item">
                                <button 
                                    className="btn btn-custom-secondary position-relative d-flex align-items-center gap-2"
                                    data-bs-toggle="offcanvas" 
                                    data-bs-target="#cartOffcanvas"
                                >
                                    <i className="fas fa-shopping-cart"></i>
                                    <span>Carrito</span>
                                    {totalItems > 0 && (
                                        <span className="cart-badge">{totalItems}</span>
                                    )}
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Cart Offcanvas */}
            <div className="offcanvas offcanvas-end glass" tabindex="-1" id="cartOffcanvas" aria-labelledby="cartOffcanvasLabel">
                <div className="offcanvas-header bg-dark text-white">
                    <h5 className="offcanvas-title font-weight-bold" id="cartOffcanvasLabel">
                        <i className="fas fa-shopping-cart me-2"></i> Tu Carrito
                    </h5>
                    <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div className="offcanvas-body d-flex flex-grow-1 flex-column">
                    {store.cart && store.cart.length === 0 ? (
                        <div className="text-center py-5 my-auto">
                            <i className="fas fa-cart-arrow-down fa-3x text-muted mb-3"></i>
                            <p className="text-muted">¡Tu carrito está vacío!</p>
                            <Link to="/shop" className="btn btn-custom-primary mt-2" data-bs-dismiss="offcanvas">
                                Ver Productos
                            </Link>

                        </div>
                    ) : (
                        <>
                            <div className="flex-grow-1 overflow-auto">
                                {store.cart.map((item) => (
                                    <div key={item.id} className="d-flex align-items-center mb-3 p-2 bg-white rounded-3 shadow-sm">
                                        <img 
                                            src={item.image_url} 
                                            alt={item.name} 
                                            style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "https://images.unsplash.com/photo-1515488042361-404e92537a2a?q=80&w=100&auto=format&fit=crop";
                                            }}
                                        />
                                        <div className="ms-3 flex-grow-1">
                                            <h6 className="mb-0 font-weight-bold text-dark">{item.name}</h6>
                                            <small className="text-primary font-weight-bold">${new Intl.NumberFormat('es-CL').format(item.price)}</small>

                                            <div className="d-flex align-items-center mt-1">
                                                <button 
                                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    -
                                                </button>
                                                <span className="mx-2 font-weight-bold">{item.quantity}</span>
                                                <button 
                                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <button 
                                            className="btn btn-sm text-danger ms-2"
                                            onClick={() => handleRemoveFromCart(item.id)}
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="border-top pt-3 mt-auto">
                                <div className="d-flex justify-content-between mb-3">
                                    <span className="font-weight-bold h5 mb-0 text-dark">Total:</span>
                                    <span className="font-weight-bold h5 mb-0 text-primary">${totalPrice}</span>
                                </div>
                                <button 
                                    className="btn btn-custom-primary w-100 py-2 font-weight-bold"
                                    onClick={() => {
                                        if (store.cart) {
                                            store.cart.forEach(item => {
                                                for (let i = 0; i < item.quantity; i++) {
                                                    fetch(`${backendUrl}/api/products/${item.id}/sale`, {
                                                        method: "POST"
                                                    }).catch(err => console.error("Error logging sale:", err));
                                                }

                                            });
                                        }
                                        alert("¡Gracias por tu compra! Tu orden fue procesada exitosamente.");
                                        dispatch({ type: "clear_cart" });
                                    }}
                                    data-bs-dismiss="offcanvas"
                                >

                                    Proceder al Pago
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};