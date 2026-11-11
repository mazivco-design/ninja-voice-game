#!/bin/sh
# מעדכן את גרסת הילדים (stable/) למצב הנוכחי של המשחק.
# מריצים מתיקיית השורש של המאגר:  sh tools/update-stable.sh
# ההקלטות (audio/) לא מועתקות – גרסת הילדים קוראת אותן מהתיקייה הראשית (../audio/).
set -e
[ -f ninja-voice-game.html ] || { echo "run from the repo root"; exit 1; }
rm -rf stable/js stable/css
mkdir -p stable
cp -r js css stable/
cp ninja-voice-game.html ninja-figure.js index.html animator.html word-test.html stable/
sed -i "s#'audio/#'../audio/#g" stable/js/*.js
if grep -n "[\"']audio/" stable/js/*.js stable/*.html; then echo "audio path left unpatched"; exit 1; fi
echo "stable/ updated"
