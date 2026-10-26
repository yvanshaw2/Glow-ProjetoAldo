---
titulo: Telas e rotas – Equipe
assunto: equipe
origem: Documentação de Arquitetura de Software, seção 3.2 (Quadros 3 e 4) e Apêndice A
---

# Telas e rotas: Equipe

Valem para todas as rotas, sem repetição abaixo ([../padroes/api.md](../padroes/api.md)): erros comuns 400, 401, 403 e 404 no formato Problem Details; parâmetros `page` e `pageSize` em toda listagem; `updatedAt` obrigatório em `PATCH` e `PUT`, com 409 `VERSION_CONFLICT`. Campos com `*` são obrigatórios.

## Telas

| Rota | Tela | Acesso | Casos de uso |
|---|---|---|---|
| `/admin/staff` | Funcionários e cargos | permissão `staff` | UC19, UC20, UC21 |

Proteção das páginas: [../acesso/autenticacao.md](../acesso/autenticacao.md).

## API

### Rotas do painel: funcionários e cargos

Acesso: Perfis `staff` ou `admin` com a permissão `staff`.

#### `GET /api/admin/staff`

Lista os funcionários, sem a conta de administrador (UC20).

- Entrada: `includeInactive`
- Resposta: **200** lista paginada de `id`, `firstName`, `lastName`, `email`, `jobTitle` (ou `null`), `roleId`, `roleName`, `isActive` e `updatedAt`, em ordem alfabética pelo nome e, em seguida, pelo sobrenome; sem a conta de administrador (RN027).

#### `POST /api/admin/staff`

Cadastra um funcionário (UC19).

- Entrada: `firstName*, lastName*, email*, password*, jobTitle, roleId*`; `roleId` precisa ser de um cargo ativo (RN026): cargo inexistente ou inativo, 400 em `roleId`.
- Resposta: **201** o funcionário, com os campos da lista e a troca de senha pendente; 409 `EMAIL_IN_USE` com a mensagem "Já existe uma conta com este e-mail.", pois o e-mail vale entre clientes, funcionários e o administrador (RN022).

#### `PATCH /api/admin/staff/:id`

Edita, desativa ou reativa um funcionário.

- Entrada: `updatedAt*` e, ao menos um, `firstName`, `lastName`, `jobTitle`, `roleId` e `isActive`. Só o que veio é alterado; `jobTitle` vazio apaga a descrição. `roleId` precisa ser de um cargo ativo; manter o cargo atual vale mesmo que ele esteja inativo (RN026). `email`, `password` e `id` não são alterados por esta rota e são descartados.
- Resposta: **200** o funcionário, com os campos da lista; 404 também para a conta de administrador (RN027); 409 `VERSION_CONFLICT`.

#### `GET /api/admin/roles`

Lista os cargos (UC21).

- Entrada: `includeInactive`
- Resposta: **200** lista paginada de `id`, `name`, `description` (ou `null`), `permissionKeys` (na ordem de RN025), `isActive` e `updatedAt`, em ordem alfabética pelo nome. O cadastro de funcionário lê os cargos ativos (`includeInactive` ausente) em uma página de até 50, o máximo de RNF008.

#### `POST /api/admin/roles`

Cria um cargo.

- Entrada: `name*, description, permissionKeys*`; Ao menos uma permissão.
- Resposta: **201** o cargo, com os campos da lista; 409 `NAME_IN_USE`.

#### `PATCH /api/admin/roles/:id`

Edita, desativa ou reativa um cargo.

- Entrada: `name, description, permissionKeys, isActive`; Ao menos uma permissão.
- Resposta: **200** o cargo, com os campos da lista; 409 `NAME_IN_USE`.
