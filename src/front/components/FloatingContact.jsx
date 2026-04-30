import React from "react";

export const FloatingContact = () => {
    return (
        <>
            {/* WhatsApp Floating Button */}
            <a 
                href="https://wa.me/56912345678" 
                className="whatsapp-float" 
                target="_blank" 
                rel="noopener noreferrer"
                title="Contáctanos por WhatsApp"
            >
                <i className="fab fa-whatsapp"></i>
            </a>

            {/* Social Floating Sidebar */}
            <div className="social-sidebar d-none d-md-flex">
                <a href="tel:+56912345678" className="social-icon contact-btn">
                    <i className="fas fa-phone-alt"></i>
                </a>
                <a href="mailto:contacto@pequenosexploradores.cl" className="social-icon contact-btn">
                    <i className="fas fa-envelope"></i>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon contact-btn">
                    <i className="fab fa-instagram"></i>
                </a>
            </div>

            <style>{`
                .whatsapp-float {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background-color: #25d366;
                    color: #FFF;
                    border-radius: 50px;
                    text-align: center;
                    font-size: 30px;
                    box-shadow: 2px 2px 3px #999;
                    z-index: 1000;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-decoration: none;
                    transition: all 0.3s ease;
                }
                .whatsapp-float:hover {
                    transform: scale(1.1);
                    color: #FFF;
                    background-color: #128c7e;
                }

                .social-sidebar {
                    position: fixed;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    flex-direction: column;
                    z-index: 1000;
                    background-color: #F5A623;
                    border-radius: 0 12px 12px 0;
                    overflow: hidden;
                    box-shadow: 2px 2px 10px rgba(0,0,0,0.1);
                }

                .social-icon {
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    text-decoration: none;
                    font-size: 18px;
                    transition: all 0.3s ease;
                }

                .social-icon:hover {
                    background-color: #e0961d;
                    color: white;
                }
            `}</style>

        </>
    );
};
