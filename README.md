# Pantanal em Voz

Salas coletivas para conversar sobre o Pantanal. Cada grupo cria uma sala visível ou secreta, compartilha o convite por QR code e publica mensagens pelo celular. As contribuições e respostas ficam registradas para todo o grupo; quem enviou pode editar a própria contribuição, e os gerentes da sala e do app também podem editar.

**Acesse o app:** <https://pantanal-em-voz.ernandes-sobreira.chatgpt.site>

## Como funciona

- Salas visíveis aparecem na lista pública. Salas secretas não aparecem na lista e são acessadas pelo link ou QR code. Qualquer pessoa com o convite consegue entrar em uma sala secreta.
- Participantes entram sem criar conta, escolhem um nome e podem publicar mensagens e respostas.
- As conversas são guardadas no banco de dados do app e atualizadas para os demais participantes.
- O autor pode editar sua mensagem ou resposta no aparelho em que a publicou. O gerente da sala pode editar usando a chave da sala; o gerente do app pode editar em qualquer sala após entrar com a conta responsável.
- Os temas incluem água, fogo e queimadas, agrotóxicos, hormônios na água, cheias e secas, fauna e flora, pecuária e campo, lixo e esgoto.
- As mensagens ajudam a preparar comunicações para diferentes públicos, como vizinhos, comerciantes, representantes públicos, produtores rurais, professores, cientistas, pessoas idosas, crianças e estudantes.

## Autores

- Ernandes
- Beatriz Ferraz Bühler
- Maísa Consuelo dos Santos
- Juliana Cássia de Marchi
- Elaine
- Basirat

## Desenvolvimento

Este projeto usa Next.js/Vinext, React, TypeScript e Cloudflare D1. O app publicado usa recursos de hospedagem e banco de dados configurados pelo serviço Sites.

Para trabalhar no código:

1. Use Node.js `>=22.13.0` e pnpm.
2. Instale as dependências com `pnpm install`.
3. Inicie o servidor local com `pnpm dev`.

A criação e edição de salas no ambiente publicado depende do banco D1 e das configurações de hospedagem deste projeto. Não coloque chaves de gerente, credenciais ou arquivos locais de ambiente no repositório.

## Repositório e acesso

O código está neste repositório público. O aplicativo em funcionamento é publicado separadamente no endereço acima, que pode ser enviado diretamente às pessoas ou compartilhado por QR code dentro das salas.
