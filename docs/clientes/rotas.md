---
titulo: Telas e rotas – Clientes e veículos
assunto: clientes
origem: Documentação de Arquitetura de Software, seção 3.2 (Quadros 3 e 4) e Apêndice A
---

# Telas e rotas: Clientes e veículos

Valem para todas as rotas, sem repetição abaixo ([../padroes/api.md](../padroes/api.md)): erros comuns 400, 401, 403 e 404 no formato Problem Details; parâmetros `page` e `pageSize` em toda listagem; `updatedAt` obrigatório em `PATCH` e `PUT`, com 409 `VERSION_CONFLICT`. Campos com `*` são obrigatórios.

## Telas

| Rota | Tela | Acesso | Casos de uso |
|---|---|---|---|
| `/profile` | Área do cliente: dados da conta e veículos | Cliente | UC04, UC05 |
| `/admin/clients` | Clientes e veículos | permissão `clients` | UC16, UC17, UC18 |

Proteção das páginas: [../acesso/autenticacao.md](../acesso/autenticacao.md).

## API

### Rotas do cliente: conta e veículos

Acesso: Perfil `client`; opera só sobre os dados do cliente da sessão (RS009).

#### `GET /api/me/profile`

Dados da conta (UC04).

- Entrada: Nenhuma.
- Resposta: **200** `firstName`, `lastName`, `email`, `phone` (os 11 algarismos) e `updatedAt`.

#### `PATCH /api/me/profile`

Altera os dados da conta.

- Entrada: `updatedAt*` e, ao menos um, `firstName`, `lastName` e `phone`. Só o que veio é alterado. O e-mail não é alterado.
- Resposta: **200** os mesmos campos do `GET`, com o novo `updatedAt`; 400; 409 `VERSION_CONFLICT`.

#### `GET /api/me/vehicles`

Lista os veículos vinculados à conta do cliente.

- Entrada: Nenhuma.
- Resposta: **200** lista paginada de `id`, `plate`, `type`, `size`, `brand`, `model`, `color`, `year`, `isShared` (o veículo também está vinculado a outra conta e só a empresa altera os dados dele, RN036, UC05 FE03) e `updatedAt`, na ordem em que foram vinculados à conta.

#### `GET /api/me/vehicles/lookup`

Consulta uma placa antes do cadastro (UC05).

- Entrada: `plate*`
- Resposta: **200** `type`, `brand`, `model`, `color` e `year` do veículo, se a placa já estiver cadastrada, ou `null`; nunca devolve dados de clientes.

#### `POST /api/me/vehicles`

Cadastra um veículo ou vincula à conta o veículo de uma placa já cadastrada (UC05).

- Entrada: `plate*`; Placa nova: `type*, brand*, model*, color*, year*`. Com a placa já cadastrada, só `plate` vale e os demais campos são ignorados: o veículo existente é vinculado sem ser alterado (RN036). Com a placa nova, faltando algum dos cinco dados, 400 com os campos.
- Resposta: **201** veículo criado ou vinculado, com o porte definido; 409 `VEHICLE_ALREADY_LINKED`, com a mensagem "Este veículo já está na sua conta.".

#### `PATCH /api/me/vehicles/:id`

Edita um veículo do cliente (UC05).

- Entrada: `updatedAt*` e, ao menos um, `type`, `plate`, `brand`, `model`, `color` e `year`. Só o que veio é alterado.
- Resposta: **200** veículo atualizado, com o porte redefinido se o tipo mudar; 404 se o veículo não existe ou não está na conta do cliente (RS009); 409 `VEHICLE_SHARED` se o veículo também estiver vinculado a outra conta; `PLATE_IN_USE`; `VERSION_CONFLICT`.

### Rotas do painel: clientes e veículos

Acesso: Perfis `staff` ou `admin` com a permissão `clients`.

#### `GET /api/admin/clients`

Lista e busca clientes (UC17).

- Entrada: `search, page, pageSize`
- Resposta: **200** lista paginada de `id`, `firstName`, `lastName`, `email`, `phone` (os 11 algarismos) e `updatedAt`, em ordem alfabética pelo nome completo; `search` separa o termo em palavras, e cada uma precisa aparecer, sem diferenciar maiúsculas, no nome, no sobrenome, no e-mail ou no telefone (neste, vale com ou sem a máscara).

#### `GET /api/admin/clients/:id`

Detalha um cliente.

- Entrada: Nenhuma.
- Resposta: **200** `id`, `firstName`, `lastName`, `email`, `phone` e `updatedAt`.

#### `GET /api/admin/clients/:id/vehicles`

Lista os veículos do cliente.

- Entrada: Nenhuma.
- Resposta: **200** lista paginada de `id`, `plate`, `type`, `size`, `brand`, `model`, `color`, `year`, `isShared` e `updatedAt`, na ordem do vínculo com a conta e, no empate, pelo identificador do veículo; `isShared` é verdadeiro quando há outro vínculo com o veículo, inclusive de conta excluída. 404 se o cliente não existe ou foi excluído.

#### `POST /api/admin/clients`

Cadastra um cliente (UC16).

- Entrada: `email*, firstName*, lastName*, phone*, password*`
- Resposta: **201** cliente criado, com troca de senha pendente; 409 `EMAIL_IN_USE`, com a mensagem "Já existe uma conta com este e-mail." (o e-mail pode ser de um cliente ou de um funcionário).

#### `PATCH /api/admin/clients/:id`

Edita os dados do cliente.

- Entrada: `firstName, lastName, phone`
- Resposta: **200** cliente atualizado.

#### `DELETE /api/admin/clients/:id`

Exclui a conta do cliente por exclusão lógica; veículos e agendamentos são preservados (RN030).

- Entrada: Nenhuma.
- Resposta: **204** conta excluída.

#### `GET /api/admin/vehicles/lookup`

Consulta uma placa antes do cadastro (UC18).

- Entrada: `plate*`
- Resposta: **200** `type`, `brand`, `model`, `color` e `year` do veículo, se a placa já estiver cadastrada, ou `null`; nunca devolve dados de clientes.

#### `POST /api/admin/clients/:id/vehicles`

Cadastra um veículo para o cliente ou vincula o veículo de uma placa já cadastrada (UC18).

- Entrada: `plate*`; Placa nova: `type*, brand*, model*, color*, year*`. Com a placa já cadastrada, só `plate` vale e os demais campos são ignorados: o veículo existente é vinculado sem ser alterado (RN036). Com a placa nova, os cinco dados são obrigatórios; faltando algum, 400 com os campos.
- Resposta: **201** veículo criado ou vinculado, com o porte definido; 404 se o cliente não existe ou foi excluído; 409 `VEHICLE_ALREADY_LINKED`, com a mensagem "Este veículo já está na conta do cliente.".

#### `PATCH /api/admin/vehicles/:id`

Edita um veículo, inclusive o vinculado a mais de uma conta (UC18).

- Entrada: `updatedAt*` e, ao menos um, `type`, `plate`, `brand`, `model`, `color` e `year`. Só o que veio é alterado.
- Resposta: **200** o veículo, com os campos da lista e o porte redefinido se o tipo mudar; 400; 404; 409 `PLATE_IN_USE` e `VERSION_CONFLICT`. Os agendamentos já registrados não mudam (RN037).
