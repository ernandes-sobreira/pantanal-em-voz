# Pantanal em Voz

App coletivo para aproximar pessoas e conversar sobre o Pantanal.

**App ao vivo:** <https://pantanal-em-voz.ernandes-sobreira.chatgpt.site>

## Roletas e salas

- Duas roletas sorteiam um público e um tema para abrir uma conversa. Também é possível girar cada uma separadamente ou escolher o público e o tema manualmente.
- A sala guarda o tema e seu público principal. Cada mensagem pode ser direcionada a outro público, se o grupo quiser.
- Salas visíveis aparecem na lista pública. Salas secretas não aparecem na lista e são acessadas pelo link ou QR code. Qualquer pessoa com o convite consegue entrar numa sala secreta.
- Participantes entram sem criar conta, escolhem um nome e podem publicar mensagens e respostas. As conversas ficam salvas para o grupo.
- O autor pode editar sua mensagem ou resposta no aparelho em que a publicou. O gerente da sala usa a chave da sala; o gerente do app pode editar em qualquer sala.
- Os temas incluem água, fogo e queimadas, agrotóxicos, hormônios na água, cheias e secas, fauna e flora, pecuária e campo, lixo e esgoto.

## Autores

- Ernandes
- Beatriz Ferraz Bühler
- Maísa Consuelo dos Santos
- Juliana Cássia de Marchi
- Elaine
- Basirat

## Identidade visual

A interface usa a paleta azul, verde-água e coral, e as famílias Sora e Source Sans 3, seguindo a referência visual do [Chuva-MT](https://github.com/ernandes-sobreira/chuva-MT).

## Desenvolvimento

O projeto usa React, TypeScript, Vinext e Cloudflare D1. Para trabalhar no código, use Node.js `>=22.13.0`, instale as dependências com `pnpm install` e inicie o ambiente com `pnpm dev`.

A criação e edição de salas no ambiente publicado depende do banco D1 e das configurações de hospedagem deste projeto. Não coloque chaves de gerente, credenciais ou arquivos locais de ambiente no repositório.
