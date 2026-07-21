# API - SaaS de Agendamentos

Documentação completa das rotas da API.

Base URL: `http://localhost:3000`

## Autenticação

A maioria das rotas requer um token JWT no header:

```
Authorization: Bearer <token>
```

O token é obtido na rota `/authentication`.

---

## Auth (Autenticação)

### POST /authentication
Login de usuário.

**Body:**
```json
{
  "document": "12345678900",
  "password": "senha123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /validate-token
Valida se o token ainda é válido.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
  "valid": true
}
```

---

## User (Usuário / Profissional)

### POST /signup
Cadastro de novo profissional.

**Body:**
```json
{
  "name": "João Barbearia",
  "document": "12345678900",
  "password": "senha123",
  "address": {
    "cep": "01310-100",
    "street": "Av. Paulista",
    "number": "1000",
    "complement": "Sala 101",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "accountType": "professional",
  "homeService": false,
  "businessType": "Barbearia",
  "aiStyle": "amigavel",
  "customAiStyle": null,
  "workSchedule": {
    "name": "Jornada Padrão",
    "days": [
      {
        "dayOfWeek": 1,
        "startTime": "08:00",
        "endTime": "18:00",
        "appointmentInterval": 30,
        "isActive": true
      },
      {
        "dayOfWeek": 2,
        "startTime": "08:00",
        "endTime": "18:00",
        "appointmentInterval": 30,
        "isActive": true
      }
    ]
  },
  "privacyAccepted": true
}
```

**Response 201:**
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": 1,
    "name": "João Barbearia",
    "document": "12345678900",
    "accountType": "professional",
    "businessType": "Barbearia"
  }
}
```

### GET /user/profile
Busca dados do perfil do profissional logado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "name": "João Barbearia",
  "document": "12345678900",
  "phone": "11999999999",
  "accountType": "professional",
  "homeService": false,
  "businessType": "Barbearia",
  "aiStyle": "amigavel",
  "customAiStyle": null,
  "privacyAccepted": true,
  "address": {
    "cep": "01310-100",
    "street": "Av. Paulista",
    "number": "1000",
    "complement": "Sala 101",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "workSchedule": {
    "id": 1,
    "name": "Jornada Padrão",
    "isActive": true,
    "days": [
      {
        "dayOfWeek": 1,
        "startTime": "08:00",
        "endTime": "18:00",
        "appointmentInterval": 30,
        "isActive": true
      }
    ]
  }
}
```

### PUT /user/settings
Atualiza dados do profissional logado.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "João Barbearia Atualizado",
  "document": "12345678900",
  "phone": "11999999999",
  "address": {
    "cep": "01310-100",
    "street": "Av. Paulista",
    "number": "1000",
    "complement": "Sala 202",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  },
  "accountType": "professional",
  "homeService": true,
  "businessType": "Barbearia",
  "aiStyle": "profissional",
  "customAiStyle": "Tom formal e educado",
  "workSchedule": {
    "name": "Jornada de Verão",
    "isActive": true,
    "days": [
      {
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "19:00",
        "appointmentInterval": 60,
        "isActive": true
      }
    ]
  },
  "privacyAccepted": true
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "João Barbearia Atualizado",
  "document": "12345678900",
  "phone": "11999999999",
  "address": { ... },
  "workSchedule": { ... }
}
```

---

## Services (Serviços do Profissional)

### GET /services
Lista todos os serviços do profissional logado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Corte de Cabelo",
    "description": "Corte masculino completo",
    "duration": 30,
    "price": "50.00",
    "category": "Cabelo",
    "active": true,
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

### POST /services
Cria um novo serviço.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Barba Completa",
  "description": "Modelagem e acabamento de barba",
  "duration": 20,
  "price": "35.00",
  "category": "Barba",
  "active": true
}
```

**Response 201:**
```json
{
  "id": 2,
  "userId": 1,
  "title": "Barba Completa",
  "description": "Modelagem e acabamento de barba",
  "duration": 20,
  "price": "35.00",
  "category": "Barba",
  "active": true,
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### PUT /services/:id
Atualiza um serviço existente.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Barba Completa Premium",
  "description": "Modelagem com toalha quente",
  "duration": 30,
  "price": "45.00",
  "category": "Barba",
  "active": true
}
```

**Response 200:**
```json
{
  "id": 2,
  "title": "Barba Completa Premium",
  "duration": 30,
  "price": "45.00",
  ...
}
```

### PATCH /services/:id/toggle
Ativa ou desativa um serviço.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "active": false
}
```

**Response 200:**
```json
{
  "id": 2,
  "title": "Barba Completa Premium",
  "active": false,
  ...
}
```

### DELETE /services/:id
Remove um serviço.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Serviço excluído com sucesso"
}
```

---

## Customers (Clientes)

### POST /customers
Cadastra um novo cliente vinculado ao profissional.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Carlos Silva",
  "document": "98765432100",
  "phone": "11988887777",
  "email": "carlos@email.com",
  "birthDate": "1990-05-15",
  "notes": "Cliente VIP, prefere atendimento pela manhã"
}
```

**Response 201:**
```json
{
  "id": 1,
  "userId": 1,
  "name": "Carlos Silva",
  "document": "98765432100",
  "phone": "11988887777",
  "email": "carlos@email.com",
  "birthDate": "1990-05-15",
  "notes": "Cliente VIP, prefere atendimento pela manhã",
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### GET /customers
Lista todos os clientes do profissional logado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "Carlos Silva",
    "document": "98765432100",
    "phone": "11988887777",
    "email": "carlos@email.com",
    "birthDate": "1990-05-15",
    "notes": "Cliente VIP",
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

### GET /customers/:id
Busca um cliente específico com endereços e histórico.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "userId": 1,
  "name": "Carlos Silva",
  "document": "98765432100",
  "phone": "11988887777",
  "email": "carlos@email.com",
  "birthDate": "1990-05-15",
  "notes": "Cliente VIP",
  "addresses": [
    {
      "id": 1,
      "customerId": 1,
      "cep": "01310-100",
      "street": "Rua Augusta",
      "number": "500",
      "complement": "Apto 12",
      "neighborhood": "Consolação",
      "city": "São Paulo",
      "state": "SP",
      "isPrimary": true,
      "createdAt": "2025-07-16T10:00:00.000Z",
      "updatedAt": "2025-07-16T10:00:00.000Z"
    }
  ],
  "histories": [
    {
      "id": 1,
      "customerId": 1,
      "type": "preference",
      "content": "Prefere navalha ao invés de máquina",
      "createdBy": 1,
      "createdAt": "2025-07-16T10:00:00.000Z",
      "updatedAt": "2025-07-16T10:00:00.000Z"
    }
  ]
}
```

### PUT /customers/:id
Atualiza dados de um cliente.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Carlos Silva Atualizado",
  "document": "98765432100",
  "phone": "11977776666",
  "email": "carlos.novo@email.com",
  "birthDate": "1990-05-15",
  "notes": "Cliente VIP - atualizado"
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Carlos Silva Atualizado",
  ...
}
```

### DELETE /customers/:id
Remove um cliente e todos os seus dados.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Cliente excluído com sucesso"
}
```

---

## Customer Addresses (Endereços dos Clientes)

### POST /customers/:customerId/addresses
Adiciona um endereço a um cliente.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "customerId": 1,
  "cep": "01310-100",
  "street": "Rua Augusta",
  "number": "500",
  "complement": "Apto 12",
  "neighborhood": "Consolação",
  "city": "São Paulo",
  "state": "SP",
  "isPrimary": true
}
```

**Response 201:**
```json
{
  "id": 1,
  "customerId": 1,
  "cep": "01310-100",
  "street": "Rua Augusta",
  "number": "500",
  "complement": "Apto 12",
  "neighborhood": "Consolação",
  "city": "São Paulo",
  "state": "SP",
  "isPrimary": true,
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### GET /customers/:customerId/addresses
Lista endereços de um cliente.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "customerId": 1,
    "cep": "01310-100",
    "street": "Rua Augusta",
    "number": "500",
    "complement": "Apto 12",
    "neighborhood": "Consolação",
    "city": "São Paulo",
    "state": "SP",
    "isPrimary": true,
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

### PUT /customers/addresses/:id
Atualiza um endereço.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "cep": "05425-020",
  "street": "Rua Oscar Freire",
  "number": "200",
  "complement": null,
  "neighborhood": "Pinheiros",
  "city": "São Paulo",
  "state": "SP",
  "isPrimary": true
}
```

**Response 200:**
```json
{
  "id": 1,
  "cep": "05425-020",
  "street": "Rua Oscar Freire",
  ...
}
```

### DELETE /customers/addresses/:id
Remove um endereço.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Endereço excluído com sucesso"
}
```

---

## Customer Histories (Histórico do Cliente)

### POST /customers/:customerId/histories
Registra uma anotação no histórico do cliente.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "customerId": 1,
  "type": "allergy",
  "content": "Alergia a produtos com amônia"
}
```

**Response 201:**
```json
{
  "id": 1,
  "customerId": 1,
  "type": "allergy",
  "content": "Alergia a produtos com amônia",
  "createdBy": 1,
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### GET /customers/:customerId/histories
Lista o histórico de um cliente.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "customerId": 1,
    "type": "allergy",
    "content": "Alergia a produtos com amônia",
    "createdBy": 1,
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

### DELETE /customers/histories/:id
Remove um registro do histórico.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Histórico excluído com sucesso"
}
```

---

## Appointments (Agendamentos)

### POST /appointments
Cria um novo agendamento.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "customerId": 1,
  "serviceId": 1,
  "scheduledAt": "2025-07-20T14:00:00.000Z",
  "notes": "Cliente prefere corte na tesoura"
}
```

**Response 201:**
```json
{
  "id": 1,
  "userId": 1,
  "customerId": 1,
  "serviceId": 1,
  "scheduledAt": "2025-07-20T14:00:00.000Z",
  "duration": 30,
  "price": "50.00",
  "status": "scheduled",
  "notes": "Cliente prefere corte na tesoura",
  "cancelledAt": null,
  "cancellationReason": null,
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### GET /appointments
Lista agendamentos do profissional logado.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `date` (opcional): filtra por data (YYYY-MM-DD)

**Exemplo:** `GET /appointments?date=2025-07-20`

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "customerId": 1,
    "serviceId": 1,
    "scheduledAt": "2025-07-20T14:00:00.000Z",
    "duration": 30,
    "price": "50.00",
    "status": "scheduled",
    "notes": "Cliente prefere corte na tesoura",
    "cancelledAt": null,
    "cancellationReason": null,
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

### GET /appointments/:id
Busca um agendamento específico.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": 1,
  "userId": 1,
  "customerId": 1,
  "serviceId": 1,
  "scheduledAt": "2025-07-20T14:00:00.000Z",
  "duration": 30,
  "price": "50.00",
  "status": "scheduled",
  "notes": "Cliente prefere corte na tesoura",
  "cancelledAt": null,
  "cancellationReason": null,
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### PATCH /appointments/:id/status
Atualiza o status de um agendamento.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "status": "confirmed"
}
```

**Status permitidos:** `confirmed`, `completed`, `cancelled`, `no_show`

**Response 200:**
```json
{
  "id": 1,
  "status": "confirmed",
  ...
}
```

---

## Work Schedule Days (Jornada de Trabalho)

### POST /work-schedules/:workScheduleId/days
Define os dias de uma jornada de trabalho.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "workScheduleId": 1,
  "days": [
    {
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "18:00",
      "appointmentInterval": 30,
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "startTime": "08:00",
      "endTime": "18:00",
      "appointmentInterval": 30,
      "isActive": true
    },
    {
      "dayOfWeek": 3,
      "startTime": "08:00",
      "endTime": "18:00",
      "appointmentInterval": 30,
      "isActive": true
    }
  ]
}
```

**Response 201:**
```json
[
  {
    "id": 1,
    "workScheduleId": 1,
    "dayOfWeek": 1,
    "startTime": "08:00:00",
    "endTime": "18:00:00",
    "appointmentInterval": 30,
    "isActive": true,
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  },
  ...
]
```

### GET /work-schedules/:workScheduleId/days
Lista os dias de uma jornada.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "workScheduleId": 1,
    "dayOfWeek": 1,
    "startTime": "08:00:00",
    "endTime": "18:00:00",
    "appointmentInterval": 30,
    "isActive": true,
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

---

## Blocked Slots (Bloqueios de Horário)

### POST /blocked-slots
Cria um bloqueio de horário (pausa, folga, etc.).

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "type": "lunch",
  "title": "Almoço",
  "startAt": "2025-07-20T12:00:00.000Z",
  "endAt": "2025-07-20T13:00:00.000Z",
  "isRecurring": true,
  "recurrenceRule": "RRULE:FREQ=DAILY;BYHOUR=12"
}
```

**Response 201:**
```json
{
  "id": 1,
  "userId": 1,
  "type": "lunch",
  "title": "Almoço",
  "startAt": "2025-07-20T12:00:00.000Z",
  "endAt": "2025-07-20T13:00:00.000Z",
  "isRecurring": true,
  "recurrenceRule": "RRULE:FREQ=DAILY;BYHOUR=12",
  "createdAt": "2025-07-16T10:00:00.000Z",
  "updatedAt": "2025-07-16T10:00:00.000Z"
}
```

### GET /blocked-slots
Lista bloqueios do profissional.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `from` (opcional): filtra bloqueios a partir de uma data

**Exemplo:** `GET /blocked-slots?from=2025-07-20T00:00:00.000Z`

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "type": "lunch",
    "title": "Almoço",
    "startAt": "2025-07-20T12:00:00.000Z",
    "endAt": "2025-07-20T13:00:00.000Z",
    "isRecurring": true,
    "recurrenceRule": "RRULE:FREQ=DAILY;BYHOUR=12",
    "createdAt": "2025-07-16T10:00:00.000Z",
    "updatedAt": "2025-07-16T10:00:00.000Z"
  }
]
```

### DELETE /blocked-slots/:id
Remove um bloqueio.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Bloqueio excluído com sucesso"
}
```

---

## Resumo das Rotas

| Método | Rota | Autenticação | Descrição |
|--------|------|-------------|-----------|
| POST | /authentication | ❌ | Login |
| POST | /validate-token | ✅ | Valida token |
| POST | /signup | ❌ | Cadastro de usuário |
| GET | /user/profile | ✅ | Perfil do usuário |
| PUT | /user/settings | ✅ | Atualizar configurações |
| GET | /services | ✅ | Listar serviços |
| POST | /services | ✅ | Criar serviço |
| PUT | /services/:id | ✅ | Atualizar serviço |
| PATCH | /services/:id/toggle | ✅ | Ativar/desativar serviço |
| DELETE | /services/:id | ✅ | Deletar serviço |
| GET | /customers | ✅ | Listar clientes |
| POST | /customers | ✅ | Criar cliente |
| GET | /customers/:id | ✅ | Buscar cliente |
| PUT | /customers/:id | ✅ | Atualizar cliente |
| DELETE | /customers/:id | ✅ | Deletar cliente |
| POST | /customers/:customerId/addresses | ✅ | Criar endereço |
| GET | /customers/:customerId/addresses | ✅ | Listar endereços |
| PUT | /customers/addresses/:id | ✅ | Atualizar endereço |
| DELETE | /customers/addresses/:id | ✅ | Deletar endereço |
| POST | /customers/:customerId/histories | ✅ | Criar histórico |
| GET | /customers/:customerId/histories | ✅ | Listar históricos |
| DELETE | /customers/histories/:id | ✅ | Deletar histórico |
| GET | /appointments | ✅ | Listar agendamentos |
| POST | /appointments | ✅ | Criar agendamento |
| GET | /appointments/:id | ✅ | Buscar agendamento |
| PATCH | /appointments/:id/status | ✅ | Atualizar status |
| POST | /work-schedules/:workScheduleId/days | ✅ | Criar dias da jornada |
| GET | /work-schedules/:workScheduleId/days | ✅ | Listar dias da jornada |
| POST | /blocked-slots | ✅ | Criar bloqueio |
| GET | /blocked-slots | ✅ | Listar bloqueios |
| DELETE | /blocked-slots/:id | ✅ | Deletar bloqueio |
