import React, { useState, useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const ProductForm = ({ productToEdit, onSave, onCancel }) => {
    const { store, dispatch } = useGlobalReducer();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        image_url: "",
        category: "Ropa",
        stock: 10
    });

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageError, setImageError] = useState(false);



    useEffect(() => {
        setImageError(false);
        if (productToEdit) {
            setFormData({
                name: productToEdit.name || "",
                description: productToEdit.description || "",
                price: productToEdit.price || "",
                image_url: productToEdit.image_url || "",
                category: productToEdit.category || "Ropa",
                stock: productToEdit.stock || 10
            });
        } else {
            setFormData({
                name: "",
                description: "",
                price: "",
                image_url: "",
                category: store.categories && store.categories.length > 0 ? store.categories[0].name : "Ropa",
                stock: 10
            });
        }
    }, [productToEdit, store.categories]);

    useEffect(() => {
        if (!productToEdit && store.categories && store.categories.length > 0) {
            setFormData(prev => ({ ...prev, category: store.categories[0].name }));
        }
    }, [store.categories, productToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "image_url") {
            setImageError(false);
        }
        setFormData({
            ...formData,
            [name]: name === "price" || name === "stock" ? parseFloat(value) : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const url = productToEdit 
            ? `${backendUrl}/api/products/${productToEdit.id}`
            : `${backendUrl}/api/products`;
            
        const method = productToEdit ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al guardar el producto");
            }

            const data = await response.json();
            
            if (productToEdit) {
                dispatch({ type: "update_product", payload: data });
            } else {
                dispatch({ type: "add_product", payload: data });
            }

            if (onSave) onSave();
            
            // Reset form if creating
            if (!productToEdit) {
                setFormData({
                    name: "",
                    description: "",
                    price: "",
                    image_url: "",
                    category: "Ropa",
                    stock: 10
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to generate a placeholder image using standard URLs or just keeping it simple
    const handleGenerateImage = async () => {
        if (!formData.name) {
            alert("¡Por favor ingresa primero el nombre del juguete para buscar su imagen!");
            return;
        }
        
        setIsGeneratingImage(true);
        setImageError(false);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
            const response = await fetch(`${backendUrl}/api/generate-image`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ 
                    product_name: formData.name,
                    product_description: formData.description || ""
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.image_url) {
                    setFormData({
                        ...formData,
                        image_url: data.image_url
                    });
                }
            } else {
                alert("No se pudo obtener una imagen automáticamente.");
            }
        } catch (error) {
            console.error("Error generating image:", error);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-3">
            <h5 className="mb-3 text-dark font-weight-bold">
                {productToEdit ? "Editar Producto" : "Agregar Nuevo Producto"}
            </h5>


            {error && <div className="alert alert-danger">{error}</div>}            <div className="row">
                {/* Columna Izquierda: Información del Producto */}
                <div className="col-md-6">
                    <div className="mb-2">
                        <label className="form-label font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Nombre del Artículo</label>
                        <input
                            type="text"
                            className="form-control form-control-custom py-2"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Ej: Oso de Peluche Gigante"
                            style={{ fontSize: "0.9rem" }}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Descripción</label>
                        <textarea
                            className="form-control form-control-custom py-2"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="2"
                            placeholder="Describe el artículo para niños..."
                            style={{ fontSize: "0.9rem", resize: "none" }}
                        />
                    </div>

                    <div className="row g-2">
                        <div className="col-6 mb-2">
                            <label className="form-label font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Precio ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control form-control-custom py-2"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                placeholder="0.00"
                                style={{ fontSize: "0.9rem" }}
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Stock</label>
                            <input
                                type="number"
                                className="form-control form-control-custom py-2"
                                name="stock"
                                value={formData.stock}
                                onChange={handleChange}
                                required
                                placeholder="10"
                                style={{ fontSize: "0.9rem" }}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="form-label font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>Categoría</label>
                        <select
                            className="form-control form-control-custom py-2"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            style={{ fontSize: "0.9rem" }}
                        >
                            {store.categories && store.categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Columna Derecha: Multimedia / Imagen */}
                <div className="col-md-6">
                    <div className="mb-2">
                        <label className="form-label font-weight-bold mb-1" style={{ fontSize: "0.9rem" }}>URL de la Imagen</label>
                        <div className="input-group input-group-sm">
                            <input
                                type="url"
                                className="form-control form-control-custom"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleChange}
                                placeholder="https://ejemplo.com/imagen.jpg"
                                style={{ fontSize: "0.85rem" }}
                            />

                            <button 
                                type="button" 
                                className="btn btn-primary"
                                onClick={handleGenerateImage}
                                disabled={isGeneratingImage}
                                style={{ backgroundColor: "var(--color-primary, #10b981)", borderColor: "var(--color-primary, #10b981)", color: "#ffffff", fontSize: "0.85rem" }}
                            >
                                {isGeneratingImage ? "Buscando..." : "Buscar"}
                            </button>
                        </div>
                    </div>

                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: "calc(100% - 45px)" }}>
                        {formData.image_url ? (
                            <div style={{ 
                                position: "relative",
                                width: "110px", 
                                height: "110px", 
                                borderRadius: "12px", 
                                overflow: "hidden", 
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                                border: "2px solid white",
                                backgroundColor: "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                {!imageError ? (
                                    <img 
                                        src={formData.image_url} 
                                        alt="Vista previa" 
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="text-muted text-center p-2" style={{ fontSize: "0.7rem" }}>
                                        <i className="fas fa-image-slash mb-1" style={{ fontSize: "1.2rem" }}></i>
                                        <div>No cargó</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                width: "110px",
                                height: "110px",
                                borderRadius: "12px",
                                backgroundColor: "#f8fafc",
                                border: "2px dashed #cbd5e1",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#94a3b8"
                            }}>
                                <i className="fas fa-camera mb-1" style={{ fontSize: "1.5rem" }}></i>
                                <span style={{ fontSize: "0.7rem" }}>Sin foto</span>
                            </div>
                        )}
                        <small className="text-muted mt-1 text-center" style={{ fontSize: "0.75rem" }}>Escribe el nombre y busca la foto</small>
                    </div>
                </div>
            </div>
            
            <div className="d-flex gap-2 mt-3">


                <button 
                    type="submit" 
                    className="btn btn-custom-primary flex-grow-1"
                    disabled={loading}
                >
                    {loading ? "Guardando..." : productToEdit ? "Actualizar" : "Guardar"}
                </button>
                {onCancel && (
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary" 
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
};
