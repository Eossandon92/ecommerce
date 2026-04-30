export const initialStore=()=>{
  return{
    message: null,
    products: [],
    cart: [],
    categories: []
  }
}

export default function storeReducer(store, action = {}) {
  switch(action.type){
    case 'set_hello':
      return {
        ...store,
        message: action.payload
      };
      
    case 'set_products':
      return {
        ...store,
        products: action.payload
      };

    case 'set_categories':
      return {
        ...store,
        categories: action.payload
      };

    case 'add_category':
      return {
        ...store,
        categories: [...store.categories, action.payload]
      };

    case 'delete_category':
      return {
        ...store,
        categories: store.categories.filter(c => c.id !== action.payload)
      };

    case 'add_product':
      return {
        ...store,
        products: [...store.products, action.payload]
      };

    case 'update_product':
      return {
        ...store,
        products: store.products.map(p => p.id === action.payload.id ? action.payload : p)
      };

    case 'delete_product':
      return {
        ...store,
        products: store.products.filter(p => p.id !== action.payload)
      };

    case 'add_to_cart':
      // Check if item already in cart
      const existingItem = store.cart.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...store,
          cart: store.cart.map(item => 
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        };
      }
      return {
        ...store,
        cart: [...store.cart, { ...action.payload, quantity: 1 }]
      };

    case 'remove_from_cart':
      return {
        ...store,
        cart: store.cart.filter(item => item.id !== action.payload)
      };

    case 'update_cart_quantity':
      return {
        ...store,
        cart: store.cart.map(item => 
          item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
        )
      };

    case 'clear_cart':
      return {
        ...store,
        cart: []
      };

    default:
      throw Error('Unknown action.');
  }    
}

