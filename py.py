import time
import random

# Paramètres initiaux
capital = float(input("Entrez la somme de départ: "))  # Capital initial
probabilite_nul = 0.3  # Probabilité de match nul
intervalle_temps = 1  # Intervalle de temps entre chaque pari (en secondes)

# Fonction de simulation d'un pari
def simuler_pari(capital):
    somme_pari = 0.1 * capital  # 10% du capital pour chaque pari

    # Choix aléatoire des cotes pour l'équipe A et l'équipe B
    cote_a = random.uniform(2.1, 2.95)
    cote_b = random.uniform(2.1, 2.95)

    # Simulation du match
    match_nul = random.random() < probabilite_nul  # 30% de chance de match nul

    if match_nul:
        print(f"Match nul! Vous perdez {somme_pari:.2f} €. Votre capital est maintenant de {capital - somme_pari:.2f} €.")
        return capital - somme_pari  # Capital après déduction de la perte
    else:
        gain_a = somme_pari * cote_a
        gain_b = somme_pari * cote_b

        gain = random.choice([gain_a, gain_b])  # Choisir aléatoirement le gain en fonction des cotes

        capital = capital - somme_pari + gain
        print(f"Match gagné! Vous avez investi {somme_pari:.2f} € et gagné {gain:.2f} €. Votre capital est maintenant de {capital:.2f} €.")
        return capital

# Boucle de simulation
while capital > 0:
    capital = simuler_pari(capital)
    time.sleep(intervalle_temps)
    if capital <= 0:
        print("Vous avez perdu tout votre capital.")
        break
