import time
import random
import pandas as pd

# Fonction de simulation d'un pari
def simuler_pari(capital, probabilite_nul=0.3, max_paris=100):
    historique_capital = [capital]
    nombre_paris = 0
    while capital > 0 and nombre_paris < max_paris:
        somme_pari = 0.05 * capital  # 20% du capital pour chaque pari

        # Choix aléatoire des cotes pour l'équipe A et l'équipe B
        cote_a = random.uniform(2.1, 2.95)
        cote_b = random.uniform(2.1, 2.95)

        # Simulation du match
        match_nul = random.random() < probabilite_nul  # 30% de chance de match nul

        if match_nul:
            capital -= somme_pari  # Perte de la mise
        else:
            gain_a = somme_pari * cote_a
            gain_b = somme_pari * cote_b

            # Choisir aléatoirement quelle équipe a gagné
            equipe_gagnante = random.choice(['A', 'B'])

            if equipe_gagnante == 'A':
                gain = gain_a
                perte = somme_pari  # Montant perdu sur l'équipe B
            else:
                gain = gain_b
                perte = somme_pari  # Montant perdu sur l'équipe A

            # Mise à jour du capital
            capital = capital - somme_pari + gain - perte

        historique_capital.append(capital)
        nombre_paris += 1

        if capital <= 0:
            break

    return nombre_paris, round(historique_capital[-1], 2)

# Paramètres initiaux
capital_initial = 10000  # Capital initial
nombre_simulations = 100  # Nombre de simulations à effectuer
max_paris = 1000  # Limite du nombre de paris à 100

# Lancer les simulations et enregistrer les résultats
resultats_simulations = []

for _ in range(nombre_simulations):
    nombre_paris, capital_final = simuler_pari(capital_initial, max_paris=max_paris)
    resultats_simulations.append([nombre_paris, capital_final])

# Convertir les résultats en DataFrame
df = pd.DataFrame(resultats_simulations, columns=['Nombre de paris', 'Capital final'])

# Exporter les résultats vers un fichier Excel
excel_file_path = 'simulation_results_simplified.xlsx'
df.to_excel(excel_file_path, index=False)

excel_file_path
