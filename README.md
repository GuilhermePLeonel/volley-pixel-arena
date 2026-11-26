# Volley Pixel Arena

Protótipo de vôlei de quadra para navegador, com quadra 3D em perspectiva vista de cima e atrás do time e personagens e bola desenhados como sprites pixelados. É um MVP arcade: **não é uma simulação completa das regras FIVB**.

## Executar localmente

Requisitos: Node.js 20 e npm. Na pasta do projeto:

```sh
npm ci
npm run dev
```

Abra o endereço local exibido no terminal. Para verificar e gerar a versão de produção:

```sh
npm test
npm run build
npm run dev
```

O diretório `dist/` contém os arquivos estáticos. A configuração de GitHub Actions inclui publicação no Pages; no repositório, configure **Settings → Pages → Source: GitHub Actions**.

## Como jogar

Escolha posição e dificuldade e inicie uma partida ou treino. WASD move em relação à câmera; Shift corre; Espaço salta (ou realiza um mergulho curto como líbero). Mova o mouse sobre a quadra para mirar. Segure e solte o botão esquerdo para tocar; o direito realiza uma largada precisa para o lado adversário. A barra mostra a força: ataques ganham velocidade a partir de 70%; com 100% de carga, a cortada segue rapidamente até o alvo, acompanhada de um rastro de cometa e som e efeito de explosão. Em contatos baixos, uma assistência direciona a bola por cima da rede e então ao alvo, em dois trechos retos. Um círculo verde marca a região do levantamento e o rótulo identifica o atacante escolhido; os bots respeitam o destinatário, mas o usuário pode intervir. Para atacar de botão esquerdo sem saltar, mire além da linha de três metros adversária; se mirar mais curto a bola vai à rede e poderá ser recuperada nos dois primeiros toques. No terceiro toque, isso dá ponto ao adversário. Saltando, é possível atacar em toda a quadra; o botão direito permite largadas curtas sem salto. Nos dois primeiros contatos, se a bola estiver caindo ao alcance do seu jogador, ele faz automaticamente uma recepção ou levantamento na direção do mouse. O contato automático não ocorre durante o carregamento de uma ação nem no terceiro toque, que é manual e prioriza enviar a bola ao outro lado. Esc pausa e permite reiniciar. Quando for sua vez de sacar, clique para sacar parado ou salte com Espaço e segure o mouse para o saque viagem. Os saques dos demais atletas são automáticos, atrás da linha de fundo. Na recepção, o jogador controlado se reposiciona quando WASD não está pressionado; o movimento manual tem prioridade.

## Implementado

- Quadra low-poly em Three.js com proporção regulamentar de 18 × 9, projeção visual mais larga e câmera em perspectiva que acompanha a bola suavemente. Rede, antenas, sombras e 12 jogadores com sprites fornecidos pelo usuário.
- Arquibancadas com torcedores animados em laranja e preto e bandeiras com o escudo fornecido pelo usuário.
- Seleção de atletas por posição, com retratos e sprites individuais fornecidos pelo usuário; os líberos usam uniforme claro e Jefferson acompanha o jogo como técnico ao lado da quadra.
- Bola com gravidade e trajetórias balísticas, rede, antenas, piso, limite da quadra, mira no chão, indicação de alvo e arco aproximado.
- Jogador selecionável, movimento, corrida, salto, mergulho simplificado, contatos contextuais, força e direção; sons sintéticos.
- IA local com formação 5x1 simplificada, previsão de trajetória e um interceptador designado. Após o saque adversário, o ponteiro recua para receber e o levantador de fundo aguarda o passe antes de infiltrar; o líbero e o ponteiro de fundo cobrem zonas distintas; os três níveis ajustam movimentação e frequência de erros.
- Rally point, contagem de toques, dois toques consecutivos, pontuação dentro/fora, sequência de saque e seis rotações. Há verificação simplificada de ataque do fundo e do líbero acima da rede; set rápido até 7 ou melhor de cinco até 25 (tie-break até 15), com diferença de dois.
- Treino contínuo básico, pausa e reinício. Física e placar possuem testes automatizados.

## Limitações conhecidas

- A IA implementa uma organização 5x1 básica, não todas as estratégias profissionais. Coberturas, bloqueios, aproximações, faltas de posição do jogador controlado e ajustes finos de cada rotação ainda não são completos.
- O líbero é selecionável e substitui automaticamente o central de fundo em situações básicas; a lógica de substituição e as restrições ainda são simplificadas. Se o central controlado pelo jogador estiver no fundo, ele permanece em quadra. Quando o central precisa sacar, o líbero sai temporariamente. Faltas de invasão, toque na rede e várias exceções de contato ainda não são verificadas; a regra de ataque de fundo é uma aproximação.
- Os sprites usam quadros frontais e traseiros, com poses de corrida, manchete, levantamento, ataque e mergulho; ainda não há oito direções nem todas as animações solicitadas.
- O treino oferece rallies repetidos, sem exercícios individuais nem avaliação de precisão. A dificuldade ainda não altera decisões ou precisão em todos os aspectos previstos.
- A previsão visual usa a trajetória inicial planejada, mas pode mudar devido a contatos ou colisões; a qualidade do toque não considera todos os fatores de posição e timing. Não há controles de volume separados ou todas as categorias de áudio.
- A experiência foi projetada para teclado e mouse em desktop; telas pequenas não são o alvo principal.

## Arquitetura

`src/game.js` coordena partida, ações e atualização fixa; `physics.js` contém movimento balístico; `rules.js` concentra placar e contatos; `ai.js` mantém formação e decisão dos NPCs; `view.js` cria cena e sprites; `main.js` conecta entrada e interface; `audio.js` sintetiza a explosão; `style.css` define a apresentação. A simulação avança em passos de 1/60 s.

## Assets e licenças

Os sprites individuais dos atletas e do técnico foram fornecidos pelo usuário em Sprites_Volei.zip; o sprite alternativo dos adversários foi extraído de Sprites_Voleibol.pdf, fornecido pelo usuário; o PDF não informa autoria ou licença dos desenhos. As variações de uniforme foram produzidas a partir desses quadros. O escudo da Atlética de Finanças UFRRJ usado nas bandeiras também foi fornecido pelo usuário. Geometria e efeitos sonoros são gerados pelo código deste projeto. O script scripts/extract_pdf_sprites.py reproduz a extração com pypdf e Pillow. Three.js e Vite são dependências de código aberto; suas licenças acompanham os respectivos pacotes em `node_modules`. As fontes Barlow Condensed e DM Sans são carregadas do Google Fonts e disponibilizadas sob a SIL Open Font License. A aplicação precisa de acesso à rede para carregar essas fontes, mas usa fontes de reserva caso não estejam disponíveis.

Os arquivos sem nomes foram associados provisoriamente: `Variante_10` a Ryan, `Variante_11` a GN, `Variante_2` a Fabio e `Variante_levantador` a Bahia. `Variante_3` permanece sem associação.

## Próximos passos

Priorizar testes de jogabilidade com pessoas, melhorar interceptação e timing, implementar 5x1 e substituições de líbero, depois adicionar animações direcionais, treinamento por fundamento e regras oficiais completas.



## Referência de regras

A formação de recepção preserva a ordem relativa até o saque; a equipe sacadora pode se organizar livremente, conforme as [regras oficiais FIVB 2025–2028](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf), seção 7.4. A implementação ainda não verifica todos os detalhes de posicionamento do jogador humano.






