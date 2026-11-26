# VOLLEY RINO

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

Escolha posição e dificuldade e inicie uma partida ou treino. WASD move em relação à câmera; Shift corre; Espaço salta (ou realiza um mergulho curto como líbero). Mova o mouse sobre a quadra para mirar. Segure e solte o botão esquerdo para tocar; o direito realiza uma largada precisa para o lado adversário. A barra mostra a força: ataques ganham velocidade a partir de 70%; com 100% de carga, a cortada segue rapidamente até o alvo, acompanhada de um rastro de cometa e som e efeito de explosão. Em contatos baixos, uma assistência direciona a bola por cima da rede e então ao alvo, em dois trechos retos. Um círculo verde marca a região do levantamento e o rótulo identifica o atacante escolhido; os bots respeitam o destinatário, mas o usuário pode intervir. Para atacar de botão esquerdo sem saltar, mire além da linha de três metros adversária; se mirar mais curto a bola vai à rede e poderá ser recuperada nos dois primeiros toques. No terceiro toque, isso dá ponto ao adversário. Saltando, é possível atacar em toda a quadra; o botão direito permite largadas curtas sem salto. Nos dois primeiros contatos, se a bola estiver caindo ao alcance do seu jogador, ele faz automaticamente uma recepção ou levantamento na direção do mouse. O contato automático não ocorre durante o carregamento de uma ação nem no terceiro toque, que é manual e prioriza enviar a bola ao outro lado. Esc pausa e permite reiniciar. Quando for sua vez de sacar, clique para sacar parado ou salte com Espaço e segure o mouse para o saque viagem. Os saques dos demais atletas são automáticos, atrás da linha de fundo. O personagem começa o ponto na posição prevista pela formação e o jogador assume seus deslocamentos após o saque.

No celular, arraste o analógico à esquerda para se mover ou dê um toque rápido nele para saltar ou mergulhar. À direita, segure o círculo para carregar o toque e mova o dedo como em um analógico para deslocar a mira; solte para bater. O botão LARGADA permite uma jogada precisa e também direciona a mira. É possível tocar na quadra para ajustar a mira antes da jogada. Use o botão de pausa no alto da tela. Os controles funcionam simultaneamente com dedos diferentes, tanto na vertical quanto na horizontal.

## Implementado

- Quadra low-poly em Three.js com proporção regulamentar de 18 × 9, projeção visual mais larga e câmera em perspectiva que acompanha a bola suavemente. Rede, antenas listradas, árbitro em plataforma, sombras e 12 jogadores com sprites fornecidos pelo usuário.
- Arquibancadas com torcedores animados em laranja e preto e bandeiras com o escudo fornecido pelo usuário.
- Seleção de atletas por posição, com retratos e sprites individuais fornecidos pelo usuário; os líberos usam uniforme claro e Jefferson acompanha o jogo em pé e comemora os pontos da equipe.
- Bola com visual inspirado na Mikasa V200W, gravidade e trajetórias balísticas, rede, antenas, piso, limite da quadra, mira no chão, indicação de alvo e arco aproximado. A travessia por fora das antenas é considerada falta.
- Jogador selecionável, movimento, corrida, salto, mergulho simplificado, contatos contextuais, força e direção; sons sintéticos.
- Interface adaptável para celular, com analógicos de movimento e mira, salto por toque e carregamento circular de força em gestos multitoque.
- IA local com seis rotações de 5×1, recepção a três, infiltração após o passe, segundo toque de apoio, ataques de rede e fundo, bloqueio e cobertura.
- Rally point, contagem de toques, falta de posição na recepção, restrições de ataque e bloqueio e substituição automática do líbero. O set rápido vai até 7. A partida completa é melhor de cinco sets até 25, com o quinto até 15. Vale a diferença de dois pontos.
- Treino contínuo, pausa e reinício. Os testes verificam física, regras, posições iniciais, seis rotações, contatos e transições de rally.

## Sistema 5×1

A posição oficial avança somente quando o time que recebe conquista o saque. A ordem P1 → P6 → P5 → P4 → P3 → P2 indica a posição do levantador. A posição tática, o destino do movimento e os contatos são decididos separadamente. A rotação e a função oficial de rede ou fundo continuam valendo durante todas as trocas.

Em P1, quando recebe, o ponteiro de posição 2 recua para passar. Depois da recepção, ele se oferece pela saída, o oposto pela entrada e o central pelo meio. Após a primeira devolução, os jogadores buscam suas posições preferenciais em movimento. No saque próprio, o levantador saca e os atacantes de rede já começam distribuídos na entrada, meio e saída, nas funções preferenciais.

As formações editáveis ficam em [src/tactics.js](src/tactics.js). As coordenadas são expressas em metros a partir da rede e do centro, pelo lado do time. O coordenador em [src/tactical-play.js](src/tactical-play.js) usa o plano de cada rotação, a trajetória, a posição real dos atletas e a disponibilidade de cada função. Ele avalia o tempo de deslocamento, a altura do contato, a qualidade do passe e o bloqueio inimigo. A IA distribui paralela, diagonal e bola curta, reserva o levantamento ao destinatário e recompõe a cobertura quando o ataque volta do bloqueio. A rotina de movimento em [src/ai.js](src/ai.js) usa desaceleração, histerese na escolha do interceptador e desvio lateral de companheiros.

### Depuração tática

Abra a partida ou o treino e pressione **F2**. Também é possível abrir com **?tatica=1** no endereço, inclusive no celular. Escolha a rotação e o time sacador ou acione P4, P3 ou P2 para simular um levantamento seguido de ataque adversário.

O painel mostra a fase atual, a posição oficial por atleta, os alvos, a responsabilidade, a animação e o próximo contato calculado. A quadra mostra setas, a trajetória prevista, os corredores de recepção e defesa, os alvos de levantamento e a posição dos bloqueadores.

### Referências técnicas e regulamentares

- As regras de posição, ordem de rodízio, ataque de fundo e líbero, bloqueio e contatos seguem os capítulos 7, 13, 14 e 19 das [Regras Oficiais de Voleibol FIVB 2025–2028](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf). No momento do saque, a equipe receptora respeita a ordem relativa e a equipe sacadora pode se organizar livremente dentro da quadra, salvo o sacador. Um toque de bloqueio deixa três contatos disponíveis e qualquer jogador, inclusive quem bloqueou, pode fazer o primeiro.
- As seis rotações, a proteção ao levantador e as infiltrações usam os diagramas de [Volleyball Ireland, 6v6, páginas 55–56](https://www.volleyballireland.com/wp-content/uploads/2020/12/LTPD-6v6-resource.pdf) e os exemplos de [Joe Trinsey, USA Volleyball, sobre saídas de recepção](https://www.youtube.com/watch?v=TWS9W-kJXWA). As coordenadas e a primeira saída em P1 foram adaptadas à quadra e ao exemplo deste projeto.
- A relação entre a origem do ataque, o bloqueio e as linhas de defesa usa o capítulo IX do [Manual de Treinadores da FIVB](https://www.fivb.com/wp-content/uploads/2024/03/FIVB_Coach_Manual_EN.pdf). Os perfis 2–3 e 3–2 são escolhas deste jogo, inspiradas na variação de distância e número de coberturas observada na pesquisa [Analysis of attack coverage in high-level men's volleyball](https://pmc.ncbi.nlm.nih.gov/articles/PMC6006527/).

### Limitações conhecidas

- A arbitragem usa o centro dos pés para a ordem relativa, a altura do centro da bola para inferir contato acima da rede e o plano da rede para detectar bloqueios. Toque na malha por um atleta, invasão central e outras faltas de arbitragem fina ainda ficam fora da simulação. São usadas as regras publicadas de 2025–2028, com as adaptações de controle e pontuação do jogo.
- Um líbero por equipe pode substituir centrais de fundo entre rallies. A reposição do central é automática para sacar ou voltar à rede. A escolha de jogar como central preserva o atleta do usuário. O controle atual infere toque ou manchete do líbero humano pela altura do contato na zona de frente. A IA pode optar especificamente pela manchete.
- As animações usam os sprites frontais e traseiros existentes. A cobertura, as escolhas de bola e o alcance de bloqueio são aproximações; a decisão e a trajetória podem mudar com a posição real dos jogadores e o próximo contato.
- O treino contínuo e o painel permitem repetir as situações de jogo. A precisão dos controles e o desempenho variam entre aparelhos e navegadores móveis.

## Arquitetura

O jogo avança em passos de 1/60 s. `src/game.js` coordena partida e ações, `physics.js` integra a bola, `rules.js` controla placar e sequência de contatos, `tactics.js` define as formações, `tactical-play.js` distribui responsabilidades, `ai.js` executa os movimentos, `tactical-debug.js` mostra o plano durante o rally, `view.js` desenha a cena e `main.js` conecta os controles à interface.

## Assets e licenças

Os sprites individuais dos atletas e do técnico foram fornecidos pelo usuário em Sprites_Volei.zip; o sprite alternativo dos adversários foi extraído de Sprites_Voleibol.pdf, fornecido pelo usuário; o PDF não informa autoria ou licença dos desenhos. As variações de uniforme foram produzidas a partir desses quadros. O escudo da Atlética de Finanças UFRRJ usado nas bandeiras também foi fornecido pelo usuário. Geometria e efeitos sonoros são gerados pelo código deste projeto. O script scripts/extract_pdf_sprites.py reproduz a extração com pypdf e Pillow. Three.js e Vite são dependências de código aberto; suas licenças acompanham os respectivos pacotes em `node_modules`. As fontes Barlow Condensed e DM Sans são carregadas do Google Fonts e disponibilizadas sob a SIL Open Font License. A aplicação precisa de acesso à rede para carregar essas fontes, mas usa fontes de reserva caso não estejam disponíveis.

Os arquivos sem nomes foram associados provisoriamente: `Variante_10` a Ryan, `Variante_11` a GN, `Variante_2` a Fabio e `Variante_levantador` a Bahia. `Variante_3` permanece sem associação.
