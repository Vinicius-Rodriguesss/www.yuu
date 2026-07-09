# Arquitetura da Aplicação

Este documento descreve a arquitetura utilizada no projeto e como ela está organizada.

A aplicação segue uma arquitetura **monolítica**, onde todos os módulos fazem parte de um único projeto e são executados em um único servidor. Embora seja um monólito, o código é dividido em responsabilidades bem definidas para facilitar a manutenção e a evolução do sistema.

A documentação está organizada em três níveis de abstração:

* Arquitetura Macro
* Arquitetura Micro
* Arquitetura Geral

---

# Arquitetura Macro

A arquitetura macro descreve o fluxo principal de uma requisição dentro da aplicação.

```text
Cliente
    │
    ▼
Controller
    │
    ▼
Service
    │
    ▼
Model
    │
    ▼
Banco de Dados
```

### Fluxo da requisição

1. O cliente realiza uma requisição HTTP.
2. O **Controller** recebe a requisição.
3. O **Service** executa as regras de negócio.
4. O **Model** realiza as operações de acesso ao banco de dados.
5. O resultado retorna ao **Service**.
6. O **Service** devolve a resposta ao **Controller**.
7. O **Controller** envia a resposta ao cliente.

Cada camada possui uma responsabilidade específica, evitando o acoplamento entre regras de negócio, acesso aos dados e comunicação HTTP.

---

# Arquitetura Micro

## Controller

O Controller é responsável por ser a porta de entrada da aplicação.

Responsabilidades:

* Receber requisições HTTP.
* Validar dados básicos da requisição.
* Chamar o Service correspondente.
* Retornar respostas HTTP ao cliente.

O Controller **não deve conter regras de negócio**.

---

## Service

O Service concentra toda a lógica de negócio da aplicação.

Responsabilidades:

* Processar as informações recebidas pelo Controller.
* Executar validações de negócio.
* Comunicar-se com os Models.
* Orquestrar chamadas para outros serviços quando necessário.
* Retornar o resultado ao Controller.

Toda regra de negócio deve permanecer nesta camada.

---

## Model

O Model é responsável pelo acesso aos dados.

Responsabilidades:

* Representar as entidades da aplicação.
* Consultar o banco de dados.
* Inserir registros.
* Atualizar registros.
* Remover registros.

O Model não deve conhecer regras de negócio, apenas operações de persistência.

---

# Arquitetura Geral

A aplicação é desenvolvida utilizando **TypeScript** e **Express**, organizando o código em módulos responsáveis por diferentes domínios do sistema.

Embora todos os módulos pertençam ao mesmo projeto (monólito), cada um possui responsabilidades bem definidas.

## Módulo de Agendamentos

Responsável pelo gerenciamento dos agendamentos.

Principais responsabilidades:

* Criar agendamentos.
* Editar agendamentos.
* Excluir agendamentos.
* Consultar agendamentos.

---

## Módulo de Autenticação

Responsável pela segurança da aplicação.

Principais responsabilidades:

* Autenticação de usuários.
* Login.
* Validação de credenciais.
* Geração e validação de tokens.
* Controle de acesso às rotas.

---

## Módulo de Inteligência Artificial

Responsável pelas funcionalidades que utilizam IA.

Principais responsabilidades:

* Processar informações enviadas pelo usuário.
* Integrar com modelos de inteligência artificial.
* Gerar respostas ou executar tarefas automatizadas.

---

# Tecnologias

* TypeScript
* Node.js
* Express
* Banco de Dados (a definir)

---

# Objetivos da Arquitetura

Esta arquitetura busca:

* Separar responsabilidades entre as camadas.
* Facilitar a manutenção do código.
* Melhorar a organização do projeto.
* Tornar a aplicação escalável.
* Facilitar testes e futuras implementações.
