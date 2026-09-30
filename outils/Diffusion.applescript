-- Diffusion : ouvre l'app de promotion dans le navigateur.
-- Compile en Diffusion.app par `npm run construire-app`.
-- L'app reste dans le Dock tant que le serveur tourne ; la quitter l'eteint.

on lanceur()
	set dossier to do shell script "dirname " & quoted form of POSIX path of (path to me)
	return quoted form of (dossier & "/outils/lancer.sh")
end lanceur

on run
	try
		do shell script "/bin/zsh " & lanceur()
	on error texte
		display alert "Diffusion n'a pas pu démarrer" message texte as critical
		quit
	end try
end run

on reopen
	do shell script "/bin/zsh " & lanceur()
end reopen

on quit
	try
		do shell script "/bin/zsh " & lanceur() & " arreter"
	end try
	continue quit
end quit
