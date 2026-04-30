import React, { useEffect, useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { ProductForm } from "../components/ProductForm";
import { Link } from "react-router-dom";

const SafeImage = ({ src, alt, style }) => {
    const [isError, setIsError] = useState(false);
    if (isError || !src) {
        return (
            <div className="bg-light d-flex align-items-center justify-content-center text-muted" style={{ ...style }}>
                <i className="fas fa-image"></i>
            </div>
        );
    }
    return <img src={src} alt={alt} style={style} onError={() => setIsError(true)} />;
};

export const AdminPanel = () => {
    const { store, dispatch } = useGlobalReducer();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    const [activeTab, setActiveTab] = useState("products");
    const [loading, setLoading] = useState(true);
    const [banners, setBanners] = useState([]);
    const [showBannerForm, setShowBannerForm] = useState(false);
    const [bannerToEdit, setBannerToEdit] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [selectedMetricProduct, setSelectedMetricProduct] = useState(null);
    const [timeRange, setTimeRange] = useState("year"); // day, week, month, year, custom
    const [customRange, setCustomRange] = useState({ start: "", end: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, cRes, bRes] = await Promise.all([
                fetch(`${backendUrl}/api/products`),
                fetch(`${backendUrl}/api/categories`),
                fetch(`${backendUrl}/api/banners`)
            ]);
            if (pRes.ok) dispatch({ type: "set_products", payload: await pRes.json() });
            if (cRes.ok) dispatch({ type: "set_categories", payload: await cRes.json() });
            if (bRes.ok) setBanners(await bRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDeleteProduct = async (id) => {
        if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
        try {
            const res = await fetch(`${backendUrl}/api/products/${id}`, { method: "DELETE" });
            if (res.ok) dispatch({ type: "delete_product", payload: id });
        } catch (err) { console.error(err); }
    };

    const handleSaveBanner = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {
            title: fd.get("title"),
            subtitle: fd.get("subtitle"),
            image_url: fd.get("image_url"),
            button_text: fd.get("button_text") || "Ver Productos",
            link: fd.get("link") || "/shop"
        };
        const method = bannerToEdit ? "PUT" : "POST";
        const url = bannerToEdit ? `${backendUrl}/api/banners/${bannerToEdit.id}` : `${backendUrl}/api/banners`;
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (res.ok) { setShowBannerForm(false); setBannerToEdit(null); fetchData(); }
        } catch (err) { console.error(err); }
    };

    const handleDeleteBanner = async (id) => {
        if (!confirm("¿Eliminar este banner?")) return;
        try {
            const res = await fetch(`${backendUrl}/api/banners/${id}`, { method: "DELETE" });
            if (res.ok) fetchData();
        } catch (err) { console.error(err); }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch(`${backendUrl}/api/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCategoryName })
            });
            if (res.ok) { dispatch({ type: "add_category", payload: await res.json() }); setNewCategoryName(""); }
        } catch (err) { console.error(err); }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm("¿Eliminar categoría?")) return;
        try {
            const res = await fetch(`${backendUrl}/api/categories/${id}`, { method: "DELETE" });
            if (res.ok) dispatch({ type: "delete_category", payload: id });
        } catch (err) { alert("No se puede eliminar la categoría."); }
    };

    // ─── Métricas calculadas ───────────────────────────────────────────────────
    const totalProducts = store.products ? store.products.length : 0;
    const totalCategories = store.categories ? store.categories.length : 0;
    const totalStock = store.products ? store.products.reduce((acc, p) => acc + (p.stock || 0), 0) : 0;

    // Factor de escala según el rango de tiempo seleccionado
    const getScaledMetrics = (p) => {
        let factor = 1.0;
        if (timeRange === "day") factor = 0.05;
        else if (timeRange === "week") factor = 0.25;
        else if (timeRange === "month") factor = 0.55;
        const v = Math.round((p.views || 0) * factor);
        const s = Math.round((p.sales || 0) * factor);
        return { ...p, views: v, sales: s };
    };

    const productsWithMetrics = (store.products || []).map(getScaledMetrics);
    let mostSold = null, leastSold = null, mostViewed = null, leastViewed = null;
    if (productsWithMetrics.length > 0) {
        mostSold    = productsWithMetrics.reduce((a, b) => b.sales > a.sales ? b : a);
        leastSold   = productsWithMetrics.reduce((a, b) => b.sales < a.sales ? b : a);
        mostViewed  = productsWithMetrics.reduce((a, b) => b.views > a.views ? b : a);
        leastViewed = productsWithMetrics.reduce((a, b) => b.views < a.views ? b : a);
    }

    return (
        <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", marginTop: "-3rem", paddingTop: "2rem" }}>
            <div className="container py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="display-5 font-weight-bold text-dark mb-1">Panel de Administración</h1>
                    <p className="text-muted mb-0">Gestiona productos, categorías y banners de tu tienda.</p>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────────── */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 h-100" style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", color:"#fff" }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <p className="mb-1 small opacity-75">Total Productos</p>
                                <h2 className="font-weight-bold mb-0">{totalProducts}</h2>
                            </div>
                            <i className="fas fa-boxes fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 h-100" style={{ background: "linear-gradient(135deg,#f093fb,#f5576c)", color:"#fff" }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <p className="mb-1 small opacity-75">Categorías</p>
                                <h2 className="font-weight-bold mb-0">{totalCategories}</h2>
                            </div>
                            <i className="fas fa-tags fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 h-100" style={{ background: "linear-gradient(135deg,#4facfe,#00f2fe)", color:"#fff" }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <p className="mb-1 small opacity-75">Stock Global</p>
                                <h2 className="font-weight-bold mb-0">{totalStock}</h2>
                            </div>
                            <i className="fas fa-cubes fa-2x opacity-50"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sección de Métricas de Rendimiento ────────────────── */}
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                {/* Filtro de tiempo */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <h6 className="mb-0 text-muted text-uppercase font-weight-bold d-flex align-items-center" style={{ fontSize:"0.8rem", letterSpacing:"0.5px" }}>
                        <i className="fas fa-chart-pie me-2 text-primary"></i>Rendimiento de Productos
                    </h6>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {["day","week","month","year","custom"].map(r => (
                            <button key={r}
                                className={`btn btn-sm ${timeRange === r ? "btn-primary" : "btn-outline-secondary"}`}
                                style={{ borderRadius:"20px", fontSize:"0.75rem" }}
                                onClick={() => setTimeRange(r)}>
                                {r === "day" ? "Hoy" : r === "week" ? "Semana" : r === "month" ? "Mes" : r === "year" ? "Año" : "Personalizada"}
                            </button>
                        ))}
                        <button className="btn btn-sm btn-outline-success" style={{ borderRadius:"20px", fontSize:"0.75rem" }} onClick={fetchData}>
                            <i className="fas fa-sync-alt me-1"></i>Actualizar
                        </button>
                    </div>
                </div>

                {timeRange === "custom" && (
                    <div className="d-flex gap-3 mb-3 flex-wrap">
                        <div>
                            <label className="form-label small text-muted">Desde</label>
                            <input type="date" className="form-control form-control-sm"
                                value={customRange.start}
                                onChange={e => setCustomRange(r => ({ ...r, start: e.target.value }))} />
                        </div>
                        <div>
                            <label className="form-label small text-muted">Hasta</label>
                            <input type="date" className="form-control form-control-sm"
                                value={customRange.end}
                                onChange={e => setCustomRange(r => ({ ...r, end: e.target.value }))} />
                        </div>
                    </div>
                )}

                <div className="row g-3">
                    {[
                        { label:"👑 Más Vendido",     icon:"fa-trophy",     color:"#28a745", product: mostSold,    metric: "sales",  label2: "ventas" },
                        { label:"⬇️ Menos Vendido",   icon:"fa-arrow-down", color:"#dc3545", product: leastSold,   metric: "sales",  label2: "ventas" },
                        { label:"👁️ Más Visto",       icon:"fa-eye",        color:"#007bff", product: mostViewed,  metric: "views",  label2: "vistas" },
                        { label:"🕶️ Menos Visto",     icon:"fa-eye-slash",  color:"#6c757d", product: leastViewed, metric: "views",  label2: "vistas" },
                    ].map(({ label, icon, color, product, metric, label2 }) => (
                        <div className="col-md-3 col-sm-6" key={label}>
                            <div className="p-3 rounded-4 h-100" style={{ background:"#fff", border:`2px solid ${color}22` }}>
                                <p className="small text-muted mb-2">{label}</p>
                                {product ? (
                                    <>
                                        <div className="d-flex align-items-center gap-2 mb-1">
                                            <SafeImage src={product.image_url} alt={product.name} style={{ width:"36px", height:"36px", borderRadius:"8px", objectFit:"cover" }} />
                                            <span className="font-weight-bold small">{product.name}</span>
                                        </div>
                                        <p className="mb-0" style={{ color, fontSize:"1.4rem", fontWeight:700 }}>
                                            {product[metric]} <span className="small text-muted" style={{ fontSize:"0.75rem" }}>{label2}</span>
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-muted small mb-0">Sin datos</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="d-flex justify-content-center gap-2 mb-4">
                <button 
                    className={`filter-btn ${activeTab === "products" ? "active" : ""}`}
                    onClick={() => setActiveTab("products")}
                >
                    <i className="fas fa-boxes me-2"></i>Productos
                </button>
                <button 
                    className={`filter-btn ${activeTab === "categories" ? "active" : ""}`}
                    onClick={() => setActiveTab("categories")}
                >
                    <i className="fas fa-tags me-2"></i>Categorías
                </button>
                <button 
                    className={`filter-btn ${activeTab === "banners" ? "active" : ""}`}
                    onClick={() => setActiveTab("banners")}
                >
                    <i className="fas fa-image me-2"></i>Banners
                </button>
            </div>

            {/* Content Section */}
            <div className="bg-white p-4 rounded-4 shadow-sm border">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0 font-weight-bold text-dark">
                        {activeTab === "products" && "Listado de Productos"}
                        {activeTab === "categories" && "Gestión de Categorías"}
                        {activeTab === "banners" && "Banners de Inicio"}
                    </h4>
                    {activeTab === "products" && (
                        <button className="btn btn-custom-secondary" onClick={() => { setProductToEdit(null); setShowProductForm(true); }}>
                            <i className="fas fa-plus me-2"></i>Agregar Producto
                        </button>
                    )}
                    {activeTab === "banners" && (
                        <button className="btn btn-custom-secondary" onClick={() => { setBannerToEdit(null); setShowBannerForm(true); }}>
                            <i className="fas fa-plus me-2"></i>Nuevo Banner
                        </button>
                    )}
                </div>

                {activeTab === "products" && (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Imagen</th>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Precio</th>
                                    <th>Stock</th>
                                    <th className="text-end">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {store.products?.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <SafeImage src={p.image_url} alt={p.name} style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
                                        </td>
                                        <td className="font-weight-bold">{p.name}</td>
                                        <td><span className="badge bg-light text-dark border rounded-pill">{p.category}</span></td>
                                        <td className="text-primary font-weight-bold">${new Intl.NumberFormat('es-CL').format(p.price)}</td>
                                        <td>{p.stock}</td>
                                        <td className="text-end">
                                            <div className="btn-group gap-2">
                                                <button className="btn btn-sm btn-outline-info" onClick={() => setSelectedMetricProduct(p)}><i className="fas fa-chart-bar"></i></button>
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => { setProductToEdit(p); setShowProductForm(true); }}><i className="fas fa-edit"></i></button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProduct(p.id)}><i className="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "categories" && (
                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="p-4 bg-light rounded-4">
                                <h6 className="font-weight-bold mb-3">Nueva Categoría</h6>
                                <form onSubmit={handleAddCategory}>
                                    <input 
                                        type="text" 
                                        className="form-control mb-3" 
                                        placeholder="Nombre..." 
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        required
                                    />
                                    <button type="submit" className="btn btn-custom-primary w-100">Agregar</button>
                                </form>
                            </div>
                        </div>
                        <div className="col-md-8">
                            <ul className="list-group list-group-flush">
                                {store.categories?.map(c => (
                                    <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                                        <span className="font-weight-bold">{c.name}</span>
                                        <button className="btn btn-sm text-danger" onClick={() => handleDeleteCategory(c.id)}>
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === "banners" && (
                    <div className="row g-4">
                        {banners.map(b => (
                            <div className="col-md-6" key={b.id}>
                                <div className="card border shadow-sm rounded-4 overflow-hidden h-100">
                                    <div style={{ height: "150px", backgroundImage: `url(${b.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}></div>
                                    <div className="card-body">
                                        <h6 className="font-weight-bold mb-1">{b.title}</h6>
                                        <p className="text-muted small mb-3">{b.subtitle}</p>
                                        <div className="d-flex justify-content-end gap-2">
                                            <button className="btn btn-sm btn-outline-primary" onClick={() => { setBannerToEdit(b); setShowBannerForm(true); }}><i className="fas fa-edit"></i></button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteBanner(b.id)}><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {banners.length === 0 && (
                            <div className="col-12 text-center py-5">
                                <i className="fas fa-image fa-3x text-muted mb-3"></i>
                                <p className="text-muted">No has configurado banners aún.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showProductForm && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                    <div className="bg-white p-4 rounded-4 shadow-lg w-100" style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
                        <ProductForm productToEdit={productToEdit} onSave={() => { setShowProductForm(false); fetchData(); }} onCancel={() => setShowProductForm(false)} />
                    </div>
                </div>
            )}

            {showBannerForm && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                    <div className="bg-white p-4 rounded-4 shadow-lg w-100" style={{ maxWidth: "500px" }}>
                        <h5 className="font-weight-bold mb-4">{bannerToEdit ? "Editar Banner" : "Nuevo Banner"}</h5>
                        <form onSubmit={handleSaveBanner}>
                            <div className="mb-3"><label className="form-label small font-weight-bold">TÍTULO</label><input type="text" name="title" className="form-control" defaultValue={bannerToEdit?.title} required /></div>
                            <div className="mb-3"><label className="form-label small font-weight-bold">SUBTÍTULO</label><textarea name="subtitle" className="form-control" defaultValue={bannerToEdit?.subtitle} required rows="2"></textarea></div>
                            <div className="mb-3"><label className="form-label small font-weight-bold">IMAGEN URL</label><input type="text" name="image_url" className="form-control" defaultValue={bannerToEdit?.image_url} required /></div>
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-light flex-grow-1" onClick={() => setShowBannerForm(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-custom-primary flex-grow-1">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedMetricProduct && (() => {
                const p = selectedMetricProduct;
                const maxViews = Math.max(...(store.products || []).map(x => x.views || 0), 1);
                const maxSales = Math.max(...(store.products || []).map(x => x.sales || 0), 1);
                const convRate = p.views > 0 ? ((p.sales / p.views) * 100).toFixed(1) : "0.0";
                const revenue  = (p.price * p.sales).toLocaleString("es-CL");
                const health   = convRate >= 10 ? { label: "Excelente", color: "#28a745" }
                               : convRate >= 5  ? { label: "Bueno",     color: "#17a2b8" }
                               : convRate >= 1  ? { label: "Regular",   color: "#ffc107" }
                               : { label: "Bajo",  color: "#dc3545" };
                return (
                <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.55)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(5px)" }}>
                    <div className="bg-white rounded-4 shadow-lg w-100 overflow-hidden" style={{ maxWidth:"460px", position:"relative" }}>

                        {/* Header con imagen */}
                        <div className="d-flex align-items-center gap-3 p-4 pb-3" style={{ borderBottom:"1px solid #f0f0f0" }}>
                            <SafeImage src={p.image_url} alt={p.name} style={{ width:"56px", height:"56px", borderRadius:"12px", objectFit:"cover", flexShrink:0 }} />
                            <div className="flex-grow-1">
                                <h6 className="font-weight-bold mb-0">{p.name}</h6>
                                <span className="badge rounded-pill" style={{ backgroundColor: health.color + "22", color: health.color, fontSize:"0.7rem" }}>
                                    ● {health.label}
                                </span>
                            </div>
                            <button onClick={() => setSelectedMetricProduct(null)} className="btn-close"></button>
                        </div>

                        {/* KPIs rápidos */}
                        <div className="d-flex border-bottom">
                            {[
                                { val: p.views  || 0, label: "Vistas",          icon: "fa-eye",          color: "#17a2b8" },
                                { val: p.sales  || 0, label: "Ventas",          icon: "fa-shopping-cart", color: "#28a745" },
                                { val: convRate + "%", label: "Conversión",     icon: "fa-percent",      color: "#6f42c1" },
                                { val: p.stock  || 0, label: "Stock",           icon: "fa-cubes",        color: "#fd7e14" },
                            ].map(({ val, label, icon, color }) => (
                                <div key={label} className="flex-fill text-center py-3" style={{ borderRight:"1px solid #f0f0f0" }}>
                                    <i className={`fas ${icon} mb-1`} style={{ color, fontSize:"1rem" }}></i>
                                    <p className="mb-0 font-weight-bold" style={{ fontSize:"1.1rem" }}>{val}</p>
                                    <p className="text-muted mb-0" style={{ fontSize:"0.7rem" }}>{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Barras de progreso */}
                        <div className="p-4">
                            <p className="small text-muted text-uppercase font-weight-bold mb-3" style={{ fontSize:"0.7rem", letterSpacing:"0.5px" }}>Rendimiento vs. catálogo</p>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="small">👁️ Visualizaciones</span>
                                    <strong className="small">{p.views || 0}</strong>
                                </div>
                                <div className="progress rounded-pill" style={{ height:"8px", backgroundColor:"#e9ecef" }}>
                                    <div className="progress-bar rounded-pill" style={{ width:`${((p.views||0)/maxViews)*100}%`, background:"linear-gradient(90deg,#17a2b8,#4facfe)" }}></div>
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="small">🛒 Ventas</span>
                                    <strong className="small">{p.sales || 0}</strong>
                                </div>
                                <div className="progress rounded-pill" style={{ height:"8px", backgroundColor:"#e9ecef" }}>
                                    <div className="progress-bar rounded-pill" style={{ width:`${((p.sales||0)/maxSales)*100}%`, background:"linear-gradient(90deg,#28a745,#00f2fe)" }}></div>
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="small">📦 Stock disponible</span>
                                    <strong className="small">{p.stock || 0} unidades</strong>
                                </div>
                                <div className="progress rounded-pill" style={{ height:"8px", backgroundColor:"#e9ecef" }}>
                                    <div className="progress-bar rounded-pill" style={{ width:`${Math.min(((p.stock||0)/100)*100, 100)}%`, background:"linear-gradient(90deg,#fd7e14,#ffc107)" }}></div>
                                </div>
                            </div>

                            {/* Ingreso estimado */}
                            <div className="rounded-3 p-3 d-flex justify-content-between align-items-center" style={{ background:"#f8f9fa" }}>
                                <div>
                                    <p className="mb-0 small text-muted">💰 Ingreso estimado</p>
                                    <p className="mb-0 font-weight-bold" style={{ fontSize:"1.2rem", color:"#28a745" }}>${revenue}</p>
                                </div>
                                <div className="text-end">
                                    <p className="mb-0 small text-muted">Precio unitario</p>
                                    <p className="mb-0 font-weight-bold">${(p.price||0).toLocaleString("es-CL")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            <footer className="footer mt-auto py-5 text-center">
                <div className="container">
                    <p className="text-muted mb-1">Check the template documentation 📄 for help.</p>
                    <p className="text-muted">Made with ❤️ by <a href="https://4geeksacademy.com" target="_blank" rel="noopener noreferrer">4Geeks Academy</a></p>
                </div>
            </footer>
            </div>
        </div>
    );
};
