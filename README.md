# Volley Pixel Arena

Protótipo de vôlei de quadra para navegador, com quadra 3D ortográfica e personagens desenhados como sprites pixelados. É um MVP arcade: **não é uma simulação completa das regras FIVB**.

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

Escolha posição e dificuldade e inicie uma partida ou treino. WASD move em relação à câmera; Shift corre; Espaço salta (ou realiza um mergulho curto como líbero). Mova o mouse sobre a quadra para mirar. Segure e solte o botão esquerdo para tocar; o direito direciona a bola para o lado adversário. A barra mostra a força. O terceiro toque é enviado ao outro lado. Esc pausa e permite reiniciar. O saque é automático.

## Implementado

- Quadra low-poly em Three.js, câmera ortográfica, rede, antenas, sombras e 12 sprites originais desenhados em canvas e voltados para a câmera.
- Bola com gravidade e trajetórias balísticas, rede, antenas, piso, limite da quadra, mira no chão, indicação de alvo e arco aproximado.
- Jogador selecionável, movimento, corrida, salto, mergulho simplificado, contatos contextuais, força e direção; sons sintéticos.
- IA local com formação, previsão de trajetória, escolha de interceptador, recepção, levantamento e envio; três níveis ajustam principalmente a movimentação.
- Rally point, contagem de toques, dois toques consecutivos, pontuação dentro/fora, rotação simplificada quando o saque muda de equipe, set rápido até 7 ou melhor de cinco até 25 (tie-break até 15), com diferença de dois.
- Treino contínuo básico, pausa e reinício. Física e placar possuem testes automatizados.

## Limitações conhecidas

- A IA e as rotações são aproximações arcade, não uma implementação tática 5x1 completa. Bloqueios, coberturas, infiltração, aproximações, saques manuais e posicionamento regulamentar não foram implementados integralmente.
- Líbero é selecionável e tem mergulho simplificado; substituições reais, restrições completas e defesa específica ainda faltam. Faltas de invasão, toque na rede, ataque de fundo e várias exceções de contato não são verificadas.
- Sprites têm duas poses de caminhada; não há oito direções ou todas as animações solicitadas. As ações não têm animações dedicadas.
- O treino oferece rallies repetidos, sem exercícios individuais nem avaliação de precisão. A dificuldade ainda não altera decisões ou precisão em todos os aspectos previstos.
- A previsão visual é aproximada e não corresponde necessariamente à trajetória exata; a qualidade do toque não considera todos os fatores de posição e timing. Não há controles de volume separados ou todas as categorias de áudio.
- A experiência foi projetada para teclado e mouse em desktop; telas pequenas não são o alvo principal.

## Arquitetura

`src/game.js` coordena partida, ações e atualização fixa; `physics.js` contém movimento balístico; `rules.js` concentra placar e contatos; `ai.js` mantém formação e decisão dos NPCs; `view.js` cria cena e sprites; `main.js` conecta entrada, áudio sintético e interface; `style.css` define a apresentação. A simulação avança em passos de 1/60 s.

## Assets e licenças

Sprites, geometria e efeitos sonoros são gerados pelo código deste projeto. Three.js e Vite são dependências de código aberto; suas licenças acompanham os respectivos pacotes em `node_modules`. As fontes Barlow Condensed e DM Sans são carregadas do Google Fonts e disponibilizadas sob a SIL Open Font License. A aplicação precisa de acesso à rede para carregar essas fontes, mas usa fontes de reserva caso não estejam disponíveis.

## Próximos passos

Priorizar testes de jogabilidade com pessoas, melhorar interceptação e timing, implementar 5x1 e substituições de líbero, depois adicionar animações direcionais, treinamento por fundamento e regras oficiais completas.
