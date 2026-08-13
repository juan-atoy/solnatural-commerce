const MESSAGES: Record<string, string> = {
  EMPTY_CART: "Tu carrito está vacío.",
  INVALID_CUSTOMER_DATA: "Completa todos los datos de contacto y envío.",
  INVALID_EMAIL: "El correo electrónico no es válido.",
  INVALID_QUANTITY: "La cantidad solicitada no es válida.",
  PRODUCT_NOT_AVAILABLE: "Uno de los productos ya no está disponible.",
  PRODUCT_OUT_OF_STOCK: "El producto está agotado.",
  INSUFFICIENT_STOCK: "No hay inventario suficiente para uno de los productos.",
  PRODUCT_NOT_FOUND: "El producto no existe.",
  ORDER_NOT_FOUND: "El pedido no existe.",
  INVALID_ORDER_STATE: "El pedido no permite este cambio de estado.",
  UNAUTHORIZED: "Debes iniciar sesión para continuar.",
  FORBIDDEN: "No tienes permisos para realizar esta acción.",
};

/** Maps backend errors to safe Spanish messages. Never leaks database details. */
export function friendlyError(error: unknown, fallback = "Ocurrió un error. Intenta de nuevo."): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  for (const [code, message] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) {
      const detail = raw.split(`${code}:`)[1]?.trim();
      return detail ? `${message} (${detail})` : message;
    }
  }

  if (raw.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (raw.includes("User already registered")) return "Ya existe una cuenta con este correo.";
  if (raw.includes("Password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (raw.includes("Email not confirmed")) return "Debes confirmar tu correo antes de iniciar sesión.";
  return fallback;
}
