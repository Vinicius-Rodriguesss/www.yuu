// Mapa central das rotas do backend (backend/server.ts). Web e app importam
// daqui em vez de espalhar strings de path pelo código.

export const endpoints = {
  // ---- Auth do DONO ----
  auth: {
    login: "/authentication",
    verifyCode: "/authentication/verify-code",
    signup: "/signup",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    validateToken: "/validate-token",
  },

  // ---- Auth do CLIENTE FINAL ----
  client: {
    register: "/client/register",
    login: "/client/login",
    me: "/client/me",
    addresses: "/client/addresses",
    address: (id: number | string) => `/client/addresses/${id}`,
  },

  // ---- Área do dono ----
  user: {
    profile: "/user/profile",
    settings: "/user/settings",
    publicLink: "/user/public-link",
    passwordRequestCode: "/user/password/request-code",
    passwordConfirm: "/user/password/confirm",
  },

  services: {
    list: "/services",
    create: "/services",
    update: (id: number | string) => `/services/${id}`,
    toggle: (id: number | string) => `/services/${id}/toggle`,
    remove: (id: number | string) => `/services/${id}`,
  },

  products: {
    list: "/products",
    create: "/products",
    update: (id: number | string) => `/products/${id}`,
    toggle: (id: number | string) => `/products/${id}/toggle`,
    remove: (id: number | string) => `/products/${id}`,
  },

  customers: {
    list: "/customers",
    create: "/customers",
    get: (id: number | string) => `/customers/${id}`,
    update: (id: number | string) => `/customers/${id}`,
    remove: (id: number | string) => `/customers/${id}`,
    addresses: (customerId: number | string) => `/customers/${customerId}/addresses`,
    histories: (customerId: number | string) => `/customers/${customerId}/histories`,
  },

  appointments: {
    list: "/appointments",
    create: "/appointments",
    get: (id: number | string) => `/appointments/${id}`,
    update: (id: number | string) => `/appointments/${id}`,
    status: (id: number | string) => `/appointments/${id}/status`,
    meetingLink: (id: number | string) => `/appointments/${id}/meeting-link`,
  },

  availability: "/availability",
  dashboard: "/dashboard",
  caixa: {
    list: "/caixa",
    create: "/caixa",
    remove: (id: number | string) => `/caixa/${id}`,
  },
  blockedSlots: {
    list: "/blocked-slots",
    create: "/blocked-slots",
    update: (id: number | string) => `/blocked-slots/${id}`,
    remove: (id: number | string) => `/blocked-slots/${id}`,
  },

  // ---- Público (páginas /p/:slug) ----
  public: {
    profile: (slug: string) => `/public/${slug}`,
    availability: (slug: string) => `/public/${slug}/availability`,
    history: (slug: string) => `/public/${slug}/history`,
    book: (slug: string) => `/public/${slug}/appointments`,
    cancel: (slug: string, id: number | string) =>
      `/public/${slug}/appointments/${id}/cancel`,
    chat: (slug: string) => `/public/${slug}/chat`,
  },

  contact: "/contact",
} as const;
