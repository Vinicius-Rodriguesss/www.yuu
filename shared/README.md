# @shared

Código comum entre a web (`../src`) e o app (`../mobile`). **Só TypeScript puro** —
nada de React, DOM, CSS, `localStorage` ou APIs de plataforma.

| Arquivo         | O que tem                                                        |
| --------------- | --------------------------------------------------------------- |
| `types.ts`      | Interfaces das entidades (Appointment, Service, ClientSession…) |
| `endpoints.ts`  | Mapa central das rotas do backend                               |
| `http.ts`       | `createApiClient()` — fetch + auth injetável, sem storage        |
| `format.ts`     | CPF/CNPJ, telefone, CEP, moeda, datas "hora de parede", validação |

## Uso

```ts
import { createApiClient, endpoints, type Appointment } from "@shared";

const api = createApiClient({
  baseUrl: "http://localhost:3000",
  getToken: async () => SecureStore.getItemAsync("token"),
  onUnauthorized: () => signOut(),
});

const list = await api.get<Appointment[]>(endpoints.appointments.list);
```

## Migração da web (opcional, depois)

`src/api/client.ts` pode passar a instanciar `createApiClient` com
`getToken: () => localStorage.getItem("token")`, eliminando a duplicação.
