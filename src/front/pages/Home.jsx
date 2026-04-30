import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import mathBg from "../assets/img/math_bg.png";
import learningBg from "../assets/img/learning_bg.png";

export const Home = () => {
    const [banners, setBanners] = useState([]);
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        fetch(`${backendUrl}/api/banners`)
            .then(res => res.json())
            .then(data => setBanners(data))
            .catch(err => console.error("Error loading banners:", err));
    }, []);

    const defaultBanners = [
        {
            id: 'def1',
            title: "Matemáticas y Construcción",
            subtitle: "Explora el fascinante mundo de los números y las formas, construyendo juntos un futuro lleno de posibilidades y aprendizaje para cada mente.",
            image_url: mathBg,
            button_text: "Ver Productos",
            link: "/shop"
        },
        {
            id: 'def2',
            title: "Aprendizaje Temprano",
            subtitle: "Fomenta la curiosidad desde el primer día con nuestra selección Montessori.",
            image_url: learningBg,
            button_text: "Explorar Ahora",
            link: "/shop"
        }
    ];

    const displayBanners = banners.length > 0 ? banners : defaultBanners;

    return (
        <div>
            {/* Dynamic Banners */}
            {displayBanners.map((banner, index) => (
                <div 
                    key={banner.id} 
                    className="theme-banner" 
                    style={{ 
                        backgroundImage: `url(${banner.image_url})`,
                        height: index === 0 ? '80vh' : '70vh'
                    }}
                >
                    <div className="theme-banner-content">
                        <h1 className="theme-banner-title">{banner.title}</h1>
                        <p className="theme-banner-text">{banner.subtitle}</p>
                        <Link to={banner.link} className="btn btn-cyan btn-lg">
                            {banner.button_text}
                        </Link>
                    </div>
                </div>
            ))}


            {/* Features Row */}
            <div className="container">
                <div className="features-container">
                    <div className="feature-item">
                        <i className="fas fa-truck-moving feature-icon"></i>
                        <h5 className="feature-title">Despacho a todo Chile</h5>
                        <p className="feature-text">Llegamos a cada rincón del país con envíos seguros.</p>
                    </div>
                    <div className="feature-item">
                        <i className="fas fa-shield-alt feature-icon"></i>
                        <h5 className="feature-title">Pago 100% Seguro</h5>
                        <p className="feature-text">Tus transacciones están protegidas con los mejores estándares.</p>
                    </div>
                    <div className="feature-item">
                        <i className="fas fa-heart feature-icon"></i>
                        <h5 className="feature-title">Atención Personalizada</h5>
                        <p className="feature-text">Estamos aquí para ayudarte a elegir el regalo perfecto.</p>
                    </div>
                </div>
            </div>

            <div className="container py-5">

                <div className="row g-4 mb-5">
                    <div className="col-md-6">
                        <div className="p-5 rounded-4 h-100 d-flex flex-column justify-content-center" style={{ backgroundColor: "#803789", color: "white" }}>
                            <h3 className="font-weight-bold mb-3">¿Buscas algo específico?</h3>
                            <p>Explora nuestras categorías y encuentra el juguete ideal para cada etapa del desarrollo.</p>
                            <Link to="/shop" className="btn btn-outline-light mt-3 align-self-start">Ir a Categorías</Link>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="p-5 rounded-4 h-100 d-flex flex-column justify-content-center" style={{ backgroundColor: "#00C1B6", color: "white" }}>
                            <h3 className="font-weight-bold mb-3">Atención por WhatsApp</h3>
                            <p>¿Tienes dudas sobre un producto? Escríbenos y te asesoramos en tiempo real.</p>
                            <a href="https://wa.me/56912345678" className="btn btn-outline-light mt-3 align-self-start">Hablar con un experto</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div id="objetivo" className="about-section">
                <div className="container">
                    <div className="about-card">
                        <div className="about-image d-none d-lg-block">
                            <img 
                                src="https://images.unsplash.com/photo-1566770636123-649df1686618?q=80&w=600&auto=format&fit=crop" 
                                alt="Nuestra Misión" 
                                className="img-fluid"
                            />
                        </div>
                        <div className="about-content">
                            <span className="about-tag">Nuestro Objetivo</span>
                            <h2 className="about-title">Más que una tienda, somos un aliado en su desarrollo</h2>
                            <p className="about-text">
                                En <strong>Mi Pequeño Espacio</strong>, creemos que el juego es la herramienta más poderosa para el aprendizaje. Nuestra misión es seleccionar cuidadosamente juguetes y accesorios que fomenten la curiosidad, la creatividad y el bienestar de los niños. 
                            </p>
                            <p className="about-text">
                                Trabajamos con marcas que comparten nuestros valores de seguridad, durabilidad y respeto por el medio ambiente, asegurando que cada producto que llega a tu hogar sea una inversión en el futuro de tus pequeños.
                            </p>
                            <Link to="/shop" className="btn btn-custom-primary btn-lg mt-4">Conoce Nuestra Historia</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};