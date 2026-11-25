-- Diffusion : ouvre l'app de promotion (la fenetre de l'app Diffusion de
-- Chrome, sinon le navigateur), en demarrant le serveur s'il le faut.
-- Compile en Diffusion.app par `npm run construire-app`.
-- Le serveur reste allume ensuite (et toujours, avec `npm run service`) :
-- l'icone ouvre la fenetre, puis se ferme.

on run
	try
		set dossier to do shell script "dirname " & quoted form of POSIX path of (path to me)
		do shell script "/bin/zsh " & quoted form of (dossier & "/outils/lancer.sh")
	on error texte
		display alert "Diffusion n'a pas pu démarrer" message texte as critical
	end try
end run
