#!/bin/bash

cd "$(dirname "$0")"

clear

# Colori
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}"
echo "  ██╗   ██╗██╗██╗     ██╗      █████╗ "
echo "  ██║   ██║██║██║     ██║     ██╔══██╗"
echo "  ██║   ██║██║██║     ██║     ███████║"
echo "  ╚██╗ ██╔╝██║██║     ██║     ██╔══██║"
echo "   ╚████╔╝ ██║███████╗███████╗██║  ██║"
echo "    ╚═══╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝"
echo -e "${BLUE}"
echo "  ███╗   ███╗ █████╗ ██████╗ ███████╗██████╗ ██╗     ██╗   ██╗"
echo "  ████╗ ████║██╔══██╗██╔══██╗██╔════╝██╔══██╗██║     ██║   ██║"
echo "  ██╔████╔██║███████║██████╔╝█████╗  ██████╔╝██║     ██║   ██║"
echo "  ██║╚██╔╝██║██╔══██║██╔══██╗██╔══╝  ██╔══██╗██║     ██║   ██║"
echo "  ██║ ╚═╝ ██║██║  ██║██║  ██║███████╗██████╔╝███████╗╚██████╔╝"
echo "  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚══════╝ ╚═════╝ "
echo -e "${NC}"
echo ""
echo -e "${MAGENTA}  ╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}  ║${NC}        ${WHITE}🚀 FACEBOOK AUTO POSTER v1.0${NC}                           ${MAGENTA}║${NC}"
echo -e "${MAGENTA}  ╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}▸${NC} Gruppi da pubblicare:    ${WHITE}85${NC}"
echo -e "  ${GREEN}▸${NC} Foto per post:           ${WHITE}8${NC}"
echo -e "  ${GREEN}▸${NC} Tempo stimato:           ${WHITE}50-60 min${NC}"
echo ""
echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${RED}⚠${NC}  ${WHITE}IMPORTANTE:${NC}"
echo -e "     ${CYAN}•${NC} Non usare Chrome durante l'esecuzione"
echo -e "     ${CYAN}•${NC} Connessione internet stabile richiesta"
echo -e "     ${CYAN}•${NC} Non chiudere questa finestra"
echo ""
echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}▶${NC}  Premi ${WHITE}[INVIO]${NC} per iniziare la pubblicazione..."
echo -e "  ${RED}▶${NC}  Premi ${WHITE}[CTRL+C]${NC} per annullare"
echo ""

read -s

echo ""
echo -e "  ${GREEN}🚀 Avvio in corso...${NC}"
echo ""
sleep 1

npm start
