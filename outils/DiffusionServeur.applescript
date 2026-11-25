-- Diffusion serveur : garde le serveur de Diffusion allume, sans icone dans
-- le Dock, pour que l'app Diffusion de Chrome marche a tout moment.
-- Installee par `npm run service` dans ~/Applications (@RACINE@ y est
-- remplace par le dossier de Diffusion), et ouverte a chaque ouverture de
-- session. Toutes les 30 secondes, elle verifie que le serveur repond et le
-- relance sinon ; le disque Travail debranche, elle attend qu'il revienne.
--
-- Une app, et non un service macOS : macOS ne laisse lire un disque externe
-- qu'aux apps qu'on y a autorisees.

property lanceur : "@RACINE@/outils/lancer.sh"

on run
	verifier()
end run

on idle
	verifier()
	return 30
end idle

-- Double-clic sur l'app : ouvre aussi la fenetre de Diffusion.
on reopen
	try
		do shell script "/bin/zsh " & quoted form of lanceur
	end try
end reopen

on verifier()
	try
		do shell script "SANS_NAVIGATEUR=1 /bin/zsh " & quoted form of lanceur
	end try
end verifier
