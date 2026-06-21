import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Package, Search, PlusCircle, Pencil, Trash2, Filter, IndianRupee, ArrowDown, X, Layers } from "lucide-react";
import { Product } from "../types";

const CATEGORIES = ["All", "Groceries", "Beverages", "Snacks", "Dairy", "Personal Care"];

export default function AdminProducts() {
  const { fetchWithAuth, addToast } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Add/Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Groceries",
    price: "",
    stock: ""
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      addToast("Failed to load products list", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "Groceries",
      price: "",
      stock: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      price: p.price.toString(),
      stock: p.stock.toString()
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${name}'?`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/products/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        addToast(`Product deleted successfully`, "success");
        loadProducts();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to delete product", "error");
      }
    } catch (e) {
      addToast("Network action failed", "error");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, category, price, stock } = formData;

    if (!name.trim() || !category || price === "" || stock === "") {
      addToast("Please fill all required parameters", "warning");
      return;
    }

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      addToast("Price must be a valid positive number", "warning");
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      addToast("Stock quantity must be a non-negative integer", "warning");
      return;
    }

    try {
      let res;
      if (editingProduct) {
        // Edit Operation
        res = await fetchWithAuth(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            category,
            price: priceNum,
            stock: stockNum
          })
        });
      } else {
        // Add Operation
        res = await fetchWithAuth("/api/products", {
          method: "POST",
          body: JSON.stringify({
            name,
            category,
            price: priceNum,
            stock: stockNum
          })
        });
      }

      if (res.ok) {
        addToast(editingProduct ? "Product updated successfully" : "Product created successfully", "success");
        setIsModalOpen(false);
        loadProducts();
      } else {
        const err = await res.json();
        addToast(err.error || "Action failed", "error");
      }
    } catch (err) {
      addToast("Error communicating with server", "error");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-xs text-slate-500">Retrieving catalog datasets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" />
            Supermarket Catalog Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control supermarket pricing, categorizations, and restock levels. We support direct catalog editing.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <PlusCircle className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {/* Control Bars */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-white"
          />
        </div>

        {/* Filter Categories Chips */}
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Layers className="h-3 w-3" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid displays */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <p className="text-sm font-medium text-slate-400">No supermarket products found matching selected constraints.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/65 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price (₹)</th>
                <th className="px-6 py-4 text-center">Remaining Stock</th>
                <th className="px-6 py-4 text-center">Stock Meter</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock === 0;
                const isLowStock = p.stock > 0 && p.stock <= 40;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">
                      {p.name}
                      <span className="block text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                      ₹{p.price.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold">
                      {isOutOfStock ? (
                        <span className="text-rose-600">SOLD OUT</span>
                      ) : isLowStock ? (
                        <span className="text-amber-600">{p.stock} (LOW)</span>
                      ) : (
                        <span className="text-emerald-600">{p.stock} units</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs text-center">
                      <div className="w-24 bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mx-auto">
                        <div
                          className={`h-full rounded-full ${
                            isOutOfStock ? "bg-rose-600" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, (p.stock / 200) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition"
                          title="Edit pricing and stock"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg transition"
                          title="Delete from listings"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upsert Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 dark:bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-xl relative animate-scale-up">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-2 flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              {editingProduct ? "Update Catalog Listing" : "Register Supermarket SKU"}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Fill standard item metrics below. Users will select this product directly from catalog list.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Brown Rice"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Store Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Price (₹ Indian Rupees)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 150"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Initial Stock Inventory
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 100"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  {editingProduct ? "Save Changes" : "Register Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
