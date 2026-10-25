---
description: Synchronisiere lokale Dateien mit dem Remote-Repository (GitHub)
---

# Projekt synchronisieren

Um dein lokales Projekt mit den neuesten Änderungen vom Server zu aktualisieren, folge diesen Schritten:

1. Öffne dein Terminal im Projektverzeichnis.
2. Führe den folgenden Befehl aus:

```bash
git pull origin main
```

> [!NOTE]
> Da das Repository auf HTTPS umgestellt wurde, benötigt dieser Befehl für öffentliche Projekte kein Passwort oder SSH-Key-Entsperrung mehr.

---

## Fortgeschrittene Optionen

### Zurück zu SSH wechseln
Falls du jemals wieder auf SSH umstellen möchtest (z. B. um eigenen Code hochzuladen), kannst du das so tun:

```bash
git remote set-url origin git@github.com:mazer666/Phomu.git
```

### Lokale Änderungen behalten
Wenn du lokale (ungespeicherten) Änderungen hast, die du nicht verlieren willst, aber trotzdem die neuesten Sachen sehen willst:

```bash
git stash
git pull
git stash pop
```
