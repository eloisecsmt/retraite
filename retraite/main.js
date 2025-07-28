// Variables globales
let isCouple = false;

// Barème impôt sur le revenu 2025 (tranches en euros)
const BAREME_IR_2025 = [
    { min: 0, max: 11294, taux: 0 },
    { min: 11294, max: 28797, taux: 0.11 },
    { min: 28797, max: 82341, taux: 0.30 },
    { min: 82341, max: 177106, taux: 0.41 },
    { min: 177106, max: Infinity, taux: 0.45 }
];

// Calcul de l'impôt sur le revenu
function calculerImpotRevenu(revenuAnnuelBrut, nbParts) {
    // Calcul du quotient familial
    const quotientFamilial = revenuAnnuelBrut / nbParts;
    
    let impotQuotient = 0;
    
    // Application du barème progressif
    for (let tranche of BAREME_IR_2025) {
        if (quotientFamilial > tranche.min) {
            const baseImposable = Math.min(quotientFamilial, tranche.max) - tranche.min;
            impotQuotient += baseImposable * tranche.taux;
        }
    }
    
    // Impôt total = impôt du quotient × nombre de parts
    let impotTotal = impotQuotient * nbParts;
    
    // Plafonnement du quotient familial (demi-part supplémentaire plafonnée à 1678€)
    const partsEntieres = Math.floor(nbParts);
    const demiParts = nbParts - partsEntieres;
    if (demiParts > 0) {
        const impotSansAvantage = calculerImpotSansQuotient(revenuAnnuelBrut, partsEntieres);
        const economieMaxDemiPart = demiParts * 1678;
        const economieDemiPart = impotSansAvantage - impotTotal;
        
        if (economieDemiPart > economieMaxDemiPart) {
            impotTotal = impotSansAvantage - economieMaxDemiPart;
        }
    }
    
    return Math.max(0, Math.round(impotTotal));
}

// Calcul sans avantage quotient familial (pour plafonnement)
function calculerImpotSansQuotient(revenuAnnuelBrut, nbPartsEntieres) {
    const quotient = revenuAnnuelBrut / nbPartsEntieres;
    let impotQuotient = 0;
    
    for (let tranche of BAREME_IR_2025) {
        if (quotient > tranche.min) {
            const baseImposable = Math.min(quotient, tranche.max) - tranche.min;
            impotQuotient += baseImposable * tranche.taux;
        }
    }
    
    return impotQuotient * nbPartsEntieres;
}

// Calcul des impôts dans les 3 situations
function calculerTousLesImpots() {
    // Récupération des données
    const revenus1 = (parseFloat(document.getElementById('revenus1').value) || 0) * 12;
    const revenusRetraite1 = (parseFloat(document.getElementById('revenusRetraite1').value) || 0) * 12;
    const revenusAutres = (parseFloat(document.getElementById('revenusAutres').value) || 0) * 12;
    const nbParts = parseFloat(document.getElementById('parts').value) || 1;
    
    let revenus2 = 0;
    let revenusRetraite2 = 0;
    let dateRetraite1 = null;
    let dateRetraite2 = null;
    
    if (isCouple) {
        revenus2 = (parseFloat(document.getElementById('revenus2').value) || 0) * 12;
        revenusRetraite2 = (parseFloat(document.getElementById('revenusRetraite2').value) || 0) * 12;
        dateRetraite1 = new Date(document.getElementById('dateRetraite1').value);
        dateRetraite2 = new Date(document.getElementById('dateRetraite2').value);
    }
    
    // Calculs des 3 situations
    const revenusTotalActuels = revenus1 + revenus2 + revenusAutres;
    const revenusTotalRetraite = revenusRetraite1 + revenusRetraite2 + revenusAutres;
    
    const impotActuel = calculerImpotRevenu(revenusTotalActuels, nbParts);
    const impotRetraite = calculerImpotRevenu(revenusTotalRetraite, nbParts);
    
    let impotEntreDeuxRetraites = null;
    let periodeEntreDeuxRetraites = null;
    
    // Cas couple avec dates de retraite différentes
    if (isCouple && dateRetraite1 && dateRetraite2 && dateRetraite1.getTime() !== dateRetraite2.getTime()) {
        let revenusEntreDeuxRetraites;
        
        if (dateRetraite1 < dateRetraite2) {
            // Client 1 part en premier
            revenusEntreDeuxRetraites = revenusRetraite1 + revenus2 + revenusAutres;
            periodeEntreDeuxRetraites = `Du ${dateRetraite1.toLocaleDateString('fr-FR')} au ${dateRetraite2.toLocaleDateString('fr-FR')}`;
        } else {
            // Client 2 part en premier
            revenusEntreDeuxRetraites = revenus1 + revenusRetraite2 + revenusAutres;
            periodeEntreDeuxRetraites = `Du ${dateRetraite2.toLocaleDateString('fr-FR')} au ${dateRetraite1.toLocaleDateString('fr-FR')}`;
        }
        
        impotEntreDeuxRetraites = calculerImpotRevenu(revenusEntreDeuxRetraites, nbParts);
    }
    
    return {
        impotActuel,
        impotRetraite,
        impotEntreDeuxRetraites,
        periodeEntreDeuxRetraites,
        revenusTotalActuels,
        revenusTotalRetraite
    };
}

// Gestion des onglets
function switchTab(tabName) {
    // Masquer tous les contenus
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    // Désactiver tous les onglets
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Activer l'onglet et contenu sélectionnés
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Gestion couple/personne seule
function toggleCouple() {
    isCouple = document.getElementById('coupleToggle').checked;
    const sections = document.getElementById('clientSections');
    
    if (isCouple) {
        sections.classList.add('couple');
        if (sections.children.length === 1) {
            const conjointSection = createConjointSection();
            sections.appendChild(conjointSection);
        }
    } else {
        sections.classList.remove('couple');
        if (sections.children.length === 2) {
            sections.removeChild(sections.lastChild);
        }
    }
}

function createConjointSection() {
    const section = document.createElement('div');
    section.className = 'client-section';
    section.innerHTML = `
        <h4>👥 Conjoint</h4>
        <div class="form-row">
            <div class="form-group">
                <label for="nom2">Nom</label>
                <input type="text" id="nom2" placeholder="Nom de famille">
            </div>
            <div class="form-group">
                <label for="prenom2">Prénom</label>
                <input type="text" id="prenom2" placeholder="Prénom">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="age2">Âge actuel</label>
                <input type="number" id="age2" min="18" max="100" placeholder="33">
            </div>
            <div class="form-group">
                <label for="dateRetraite2">Date de départ à la retraite</label>
                <input type="date" id="dateRetraite2" onchange="calculateTimeToRetirement(2)">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="revenus2">Revenus nets actuels (€/mois)</label>
                <input type="number" id="revenus2" placeholder="2800" class="euro">
            </div>
            <div class="form-group">
                <label for="revenusRetraite2">Revenus nets prévus à la retraite (€/mois)</label>
                <input type="number" id="revenusRetraite2" placeholder="1600" class="euro">
            </div>
        </div>
        <div id="tempsRestant2" class="warning-box" style="display: none;">
            <strong>⏰ Temps restant avant la retraite : </strong><span id="dureeRetraite2"></span>
        </div>
    `;
    return section;
}

// Calcul du temps restant avant la retraite
function calculateTimeToRetirement(clientNumber = 1) {
    const dateRetraite = document.getElementById(`dateRetraite${clientNumber}`).value;
    if (dateRetraite) {
        const today = new Date();
        const retirement = new Date(dateRetraite);
        const diff = retirement - today;
        
        if (diff > 0) {
            const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
            const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
            
            document.getElementById(`dureeRetraite${clientNumber}`).textContent = `${years} ans et ${months} mois`;
            document.getElementById(`tempsRestant${clientNumber}`).style.display = 'block';
        } else {
            document.getElementById(`dureeRetraite${clientNumber}`).textContent = 'Déjà à la retraite';
            document.getElementById(`tempsRestant${clientNumber}`).style.display = 'block';
            document.getElementById(`tempsRestant${clientNumber}`).style.background = '#f8d7da';
            document.getElementById(`tempsRestant${clientNumber}`).style.color = '#721c24';
        }
    }
}

// Ajouter un crédit
function addCredit() {
    const creditsList = document.getElementById('creditsList');
    const newCredit = document.createElement('div');
    newCredit.className = 'contract-item';
    newCredit.innerHTML = `
        <div class="form-group">
            <label>Type de crédit</label>
            <select>
                <option>Immobilier</option>
                <option>Consommation</option>
                <option>Auto</option>
                <option>Autre</option>
            </select>
        </div>
        <div class="form-group">
            <label>Mensualité (€)</label>
            <input type="number" placeholder="500" class="euro">
        </div>
        <div class="form-group">
            <label>Date de fin</label>
            <input type="date">
        </div>
        <button onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
    `;
    creditsList.appendChild(newCredit);
}

// Ajouter un contrat
function addContract() {
    const contractsList = document.getElementById('contractsList');
    const newContract = document.createElement('div');
    newContract.className = 'contract-item';
    newContract.innerHTML = `
        <div class="form-group">
            <label>Type de contrat</label>
            <select>
                <option>Assurance Vie</option>
                <option>PER</option>
                <option>Capitalisation</option>
                <option>FCPI</option>
                <option>SCPI</option>
                <option>Actions</option>
                <option>Autre</option>
            </select>
        </div>
        <div class="form-group">
            <label>Montant (€)</label>
            <input type="number" placeholder="50000" class="euro">
        </div>
        <div class="form-group">
            <label>Rendement annuel (%)</label>
            <input type="number" step="0.1" placeholder="4.0" class="percentage">
        </div>
        <div class="form-group">
            <label>Déblocable</label>
            <select onchange="toggleDateField(this)">
                <option value="oui">Immédiatement</option>
                <option value="non">À une date précise</option>
            </select>
        </div>
        <div class="form-group" style="display: none;">
            <label>Date de déblocage</label>
            <input type="date">
        </div>
        <div class="form-group">
            <label>Sortie recommandée</label>
            <select>
                <option>Capital</option>
                <option>Rente</option>
                <option>Mixte</option>
            </select>
        </div>
        <button onclick="this.parentElement.remove()" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
    `;
    contractsList.appendChild(newContract);
}

// Toggle du champ date pour les contrats
function toggleDateField(select) {
    const dateField = select.parentElement.nextElementSibling;
    if (select.value === 'non') {
        dateField.style.display = 'flex';
    } else {
        dateField.style.display = 'none';
    }
}

// Calcul du budget et déficit avec impôts
function calculateBudget() {
    // Récupération des données client 1
    const revenus1 = parseFloat(document.getElementById('revenus1').value) || 0;
    const revenusRetraite1 = parseFloat(document.getElementById('revenusRetraite1').value) || 0;
    
    // Récupération des données client 2 si couple
    let revenus2 = 0;
    let revenusRetraite2 = 0;
    if (isCouple) {
        revenus2 = parseFloat(document.getElementById('revenus2').value) || 0;
        revenusRetraite2 = parseFloat(document.getElementById('revenusRetraite2').value) || 0;
    }
    
    // Autres revenus et charges
    const revenusAutres = parseFloat(document.getElementById('revenusAutres').value) || 0;
    const trainVie = parseFloat(document.getElementById('trainVie').value) || 0;
    
    // Calcul des crédits
    let totalCredits = 0;
    const creditInputs = document.querySelectorAll('#creditsList .contract-item input[type="number"]');
    creditInputs.forEach(input => {
        totalCredits += parseFloat(input.value) || 0;
    });

    // Calcul des impôts automatique
    const impots = calculerTousLesImpots();
    
    // Calculs avec impôts
    const revenusActuels = revenus1 + revenus2 + revenusAutres;
    const revenusRetraiteTotal = revenusRetraite1 + revenusRetraite2 + revenusAutres;
    
    // Revenus nets après impôts (mensuel)
    const revenusNetsActuels = revenusActuels - (impots.impotActuel / 12);
    const revenusNetsRetraite = revenusRetraiteTotal - (impots.impotRetraite / 12);
    
    const chargesTotal = trainVie + totalCredits;
    
    const deficitMensuel = chargesTotal - revenusNetsRetraite;
    const deficitAnnuel = deficitMensuel * 12;

    // Affichage des résultats avec détail des impôts
    let resultText = `
        <div style="margin-bottom: 25px;">
            <h5 style="color: #2c3e50; margin-bottom: 15px;">📊 Situation Financière Détaillée</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong>Revenus actuels (bruts)</strong><br>
                    <span style="font-size: 1.2em; color: #1976d2;">${revenusActuels.toLocaleString()} €/mois</span>
                </div>
                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong>Revenus retraite (bruts)</strong><br>
                    <span style="font-size: 1.2em; color: #7b1fa2;">${revenusRetraiteTotal.toLocaleString()} €/mois</span>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong>Charges totales</strong><br>
                    <span style="font-size: 1.2em; color: #f57c00;">${chargesTotal.toLocaleString()} €/mois</span>
                </div>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 5px solid #6c757d; margin-bottom: 20px;">
            <h5 style="color: #495057; margin-bottom: 15px;">💰 Détail des Impôts sur le Revenu</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h6 style="color: #2c3e50; margin-bottom: 10px;">🏢 Situation Actuelle</h6>
                    <p style="margin: 5px 0;"><strong>Revenus annuels :</strong> ${impots.revenusTotalActuels.toLocaleString()} €</p>
                    <p style="margin: 5px 0;"><strong>Impôt annuel :</strong> <span style="color: #dc3545;">${impots.impotActuel.toLocaleString()} €</span></p>
                    <p style="margin: 5px 0;"><strong>Impôt mensuel :</strong> <span style="color: #dc3545;">${Math.round(impots.impotActuel / 12).toLocaleString()} €</span></p>
                    <p style="margin: 5px 0;"><strong>Revenus nets/mois :</strong> <span style="color: #28a745;">${Math.round(revenusNetsActuels).toLocaleString()} €</span></p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h6 style="color: #2c3e50; margin-bottom: 10px;">🏖️ À la Retraite</h6>
                    <p style="margin: 5px 0;"><strong>Revenus annuels :</strong> ${impots.revenusTotalRetraite.toLocaleString()} €</p>
                    <p style="margin: 5px 0;"><strong>Impôt annuel :</strong> <span style="color: #dc3545;">${impots.impotRetraite.toLocaleString()} €</span></p>
                    <p style="margin: 5px 0;"><strong>Impôt mensuel :</strong> <span style="color: #dc3545;">${Math.round(impots.impotRetraite / 12).toLocaleString()} €</span></p>
                    <p style="margin: 5px 0;"><strong>Revenus nets/mois :</strong> <span style="color: #28a745;">${Math.round(revenusNetsRetraite).toLocaleString()} €</span></p>
                </div>
    `;
    
    // Ajout de la période intermédiaire si couple avec dates différentes
    if (impots.impotEntreDeuxRetraites !== null) {
        const revenusNetsEntreDeuxRetraites = (impots.revenusTotalActuels + impots.revenusTotalRetraite) / 2 - (impots.impotEntreDeuxRetraites / 12);
        
        resultText += `
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 2px solid #ffc107;">
                    <h6 style="color: #856404; margin-bottom: 10px;">⏳ Période Intermédiaire</h6>
                    <p style="font-size: 0.9em; color: #856404; margin-bottom: 10px;">${impots.periodeEntreDeuxRetraites}</p>
                    <p style="margin: 5px 0;"><strong>Impôt annuel :</strong> <span style="color: #dc3545;">${impots.impotEntreDeuxRetraites.toLocaleString()} €</span></p>
                    <p style="margin: 5px 0;"><strong>Impôt mensuel :</strong> <span style="color: #dc3545;">${Math.round(impots.impotEntreDeuxRetraites / 12).toLocaleString()} €</span></p>
                </div>
        `;
    }
    
    resultText += `
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
                <p style="margin: 0; font-size: 0.9em; color: #495057;"><strong>📝 Note :</strong> Calcul basé sur le barème IR 2025, quotient familial avec ${document.getElementById('parts').value || 1} parts.</p>
            </div>
        </div>
    `;

    // Analyse du déficit avec impôts
    if (deficitMensuel > 0) {
        const economieImpot = (impots.impotActuel - impots.impotRetraite) / 12;
        resultText += `
            <div style="background: #ffebee; border-left: 5px solid #f44336; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <h5 style="color: #c62828; margin-bottom: 15px;">⚠️ Déficit Identifié (après impôts)</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <p><strong>Déficit mensuel :</strong><br><span style="color: #d32f2f; font-size: 1.2em;">${deficitMensuel.toLocaleString()} €</span></p>
                    </div>
                    <div>
                        <p><strong>Déficit annuel :</strong><br><span style="color: #d32f2f; font-size: 1.2em;">${deficitAnnuel.toLocaleString()} €</span></p>
                    </div>
                    <div>
                        <p><strong>Économie d'impôt/mois :</strong><br><span style="color: #28a745; font-size: 1.1em;">+${economieImpot.toLocaleString()} €</span></p>
                    </div>
                </div>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 5px solid #ffc107;">
                <p style="margin: 0;"><strong>💡 Recommandation :</strong> Il faudra prévoir ${deficitMensuel.toLocaleString()} € de revenus complémentaires par mois pour maintenir votre train de vie à la retraite (impact fiscal déjà pris en compte).</p>
            </div>
        `;
    } else {
        const economieImpot = (impots.impotActuel - impots.impotRetraite) / 12;
        resultText += `
            <div style="background: #e8f5e8; border-left: 5px solid #4caf50; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                <h5 style="color: #2e7d32; margin-bottom: 15px;">✅ Situation Équilibrée (après impôts)</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <p><strong>Excédent mensuel :</strong><br><span style="color: #388e3c; font-size: 1.2em;">${Math.abs(deficitMensuel).toLocaleString()} €</span></p>
                    </div>
                    <div>
                        <p><strong>Économie d'impôt/mois :</strong><br><span style="color: #28a745; font-size: 1.1em;">+${economieImpot.toLocaleString()} €</span></p>
                    </div>
                </div>
            </div>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 5px solid #2196f3;">
                <p style="margin: 0;"><strong>🎉 Félicitations !</strong> Votre situation financière sera équilibrée à la retraite, impôts déduits.</p>
            </div>
        `;
    }

    document.getElementById('deficitText').innerHTML = resultText;
    document.getElementById('budgetResult').classList.add('show');
}

// Configuration fiscale par type de contrat
const FISCALITE_CONTRATS = {
    "Assurance Vie": {
        tauxIR: 12.8,
        tauxPS: 17.2,
        peutExonererIR: true,
        peutExonererPS: false,
        typeImposition: "plus-values",
        description: "Plus-values imposables (exonération IR possible après 8 ans)"
    },
    "PER": {
        tauxIR: 30, // Tranche marginale moyenne
        tauxPS: 0,
        peutExonererIR: false,
        peutExonererPS: true,
        typeImposition: "capital-total",
        description: "Capital total imposable à l'IR uniquement"
    },
    "Capitalisation": {
        tauxIR: 12.8,
        tauxPS: 17.2,
        peutExonererIR: false,
        peutExonererPS: false,
        typeImposition: "plus-values",
        description: "Plus-values imposables (pas d'abattement)"
    },
    "FCPI": {
        tauxIR: 12.8,
        tauxPS: 17.2,
        peutExonererIR: true,
        peutExonererPS: false,
        typeImposition: "plus-values",
        description: "Plus-values imposables (exonération IR possible selon durée)"
    },
    "SCPI": {
        tauxIR: 19,
        tauxPS: 17.2,
        peutExonererIR: false,
        peutExonererPS: false,
        typeImposition: "plus-values",
        description: "Plus-values imposables au taux forfaitaire"
    },
    "Actions": {
        tauxIR: 12.8,
        tauxPS: 17.2,
        peutExonererIR: true,
        peutExonererPS: true,
        typeImposition: "plus-values",
        description: "Plus-values imposables (PEA possible = exonération totale)"
    },
    "Autre": {
        tauxIR: 12.8,
        tauxPS: 17.2,
        peutExonererIR: false,
        peutExonererPS: false,
        typeImposition: "plus-values",
        description: "Fiscalité standard - à adapter selon le produit"
    }
};

// Mise à jour automatique de la fiscalité selon le type de contrat
function updateContractType(selectElement) {
    const contractItem = selectElement.closest('.contract-management-item');
    const typeContrat = selectElement.value;
    const config = FISCALITE_CONTRATS[typeContrat];
    
    console.log(`=== MISE À JOUR FISCALITÉ ===`);
    console.log(`Type sélectionné: ${typeContrat}`);
    console.log(`Configuration:`, config);
    
    if (!config) return;
    
    // Mise à jour des champs fiscaux avec sélecteurs robustes
    const irInput = contractItem.querySelector('input[placeholder*="12.8"], input[value="12.8"]');
    const psInput = contractItem.querySelector('input[placeholder*="17.2"], input[value="17.2"]');
    const exonerationIRSelect = contractItem.querySelector('select[onchange*="toggleIR"]');
    const exonerationPSSelects = contractItem.querySelectorAll('select[onchange*="updateContract"]');
    const exonerationPSSelect = exonerationPSSelects.length > 0 ? exonerationPSSelects[0] : null;
    
    console.log('Champs trouvés:', {
        irInput: !!irInput,
        psInput: !!psInput,
        exonerationIRSelect: !!exonerationIRSelect,
        exonerationPSSelect: !!exonerationPSSelect
    });
    
    // Mise à jour des taux avec forçage
    if (irInput) {
        irInput.value = config.tauxIR;
        irInput.style.background = '#fff3cd'; // Highlight temporaire
        setTimeout(() => irInput.style.background = 'white', 1000);
        console.log(`IR mis à jour: ${config.tauxIR}%`);
    }
    
    if (psInput) {
        psInput.value = config.tauxPS;
        psInput.style.background = '#fff3cd'; // Highlight temporaire  
        setTimeout(() => psInput.style.background = 'white', 1000);
        console.log(`PS mis à jour: ${config.tauxPS}%`);
    }
    
    // Gestion spéciale pour PER (PS = 0)
    if (typeContrat === "PER" && exonerationPSSelect) {
        exonerationPSSelect.value = 'oui';
        if (psInput) {
            psInput.value = 0;
            psInput.style.background = '#e8f5e8';
            psInput.setAttribute('readonly', true);
        }
    } else if (psInput) {
        psInput.removeAttribute('readonly');
        psInput.style.background = 'white';
    }
    
    // Mise à jour du label selon le type d'imposition
    const plusValueInput = contractItem.querySelector('input[placeholder*="estimée"], input[placeholder*="8000"], input[placeholder*="15000"]');
    const plusValueLabel = plusValueInput?.parentElement.querySelector('label');
    
    if (plusValueLabel) {
        switch (config.typeImposition) {
            case "plus-values":
                plusValueLabel.textContent = "Plus-value estimée (€)";
                break;
            case "capital-total":
                plusValueLabel.textContent = "Capital imposable (€)";
                plusValueLabel.style.color = '#dc3545';
                break;
        }
        console.log(`Label mis à jour: ${plusValueLabel.textContent}`);
    }
    
    // Affichage d'un message informatif visible
    let infoMessage = contractItem.querySelector('.fiscalite-info');
    if (!infoMessage) {
        infoMessage = document.createElement('div');
        infoMessage.className = 'fiscalite-info';
        infoMessage.style.cssText = `
            background: #e3f2fd; 
            padding: 12px; 
            border-radius: 8px; 
            margin: 15px 0; 
            font-size: 0.95em; 
            color: #1565c0;
            border-left: 4px solid #2196f3;
            font-weight: 500;
        `;
        contractItem.querySelector('.contract-details').appendChild(infoMessage);
    }
    
    infoMessage.innerHTML = `
        <strong>ℹ️ Fiscalité ${typeContrat} appliquée :</strong><br>
        ${config.description}<br>
        <span style="background: white; padding: 4px 8px; border-radius: 4px; margin-top: 8px; display: inline-block;">
            IR: <strong>${config.tauxIR}%</strong> | PS: <strong>${config.tauxPS}%</strong>
        </span>
    `;
    
    // Déclencher le recalcul immédiatement
    setTimeout(() => {
        updateContractCalculations(selectElement);
    }, 100);
    
    console.log(`Fiscalité ${typeContrat} appliquée avec succès`);
}

// Collecte des données des contrats
function getContractsData() {
    const contracts = [];
    const contractItems = document.querySelectorAll('#contractsList .contract-item');
    
    contractItems.forEach(item => {
        const type = item.querySelector('select').value;
        const montant = parseFloat(item.querySelectorAll('input[type="number"]')[0].value) || 0;
        const rendement = parseFloat(item.querySelectorAll('input[type="number"]')[1].value) || 0;
        const deblocable = item.querySelectorAll('select')[1].value;
        const dateDeblocage = item.querySelector('input[type="date"]')?.value || null;
        const sortieRecommandee = item.querySelectorAll('select')[2].value;
        
        if (montant > 0) {
            contracts.push({
                type,
                montant,
                rendement,
                deblocable: deblocable === 'oui',
                dateDeblocage,
                sortieRecommandee
            });
        }
    });
    
    return contracts;
}

// Ajouter un contrat pour la gestion des sorties - VERSION CORRIGÉE
function addManagementContract() {
    const contractsList = document.getElementById('contractsManagementList');
    const newContract = document.createElement('div');
    newContract.className = 'contract-management-item';
    newContract.innerHTML = `
        <div class="contract-header">
            <div class="form-group">
                <label>Nom du contrat</label>
                <input type="text" placeholder="Ex: PER Société Générale" style="font-weight: 600;">
            </div>
            <div class="form-group">
                <label>Type</label>
                <select>
                    <option>Assurance Vie</option>
                    <option>PER</option>
                    <option>Capitalisation</option>
                    <option>FCPI</option>
                    <option>SCPI</option>
                    <option>Actions</option>
                    <option>Autre</option>
                </select>
            </div>
            <div class="form-group">
                <label>Montant (€)</label>
                <input type="number" placeholder="50000" class="euro" onchange="updateContractCalculations(this)" oninput="updateContractCalculations(this)">
            </div>
        </div>
        
        <div class="contract-details">
            <h6 style="color: #495057; margin-bottom: 15px;">🧾 Fiscalité et Sortie</h6>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div class="form-group">
                    <label>IR sur plus-values (%)</label>
                    <input type="number" step="0.1" placeholder="12.8" class="percentage" value="12.8" onchange="updateContractCalculations(this)" oninput="updateContractCalculations(this)">
                </div>
                <div class="form-group">
                    <label>Prélèvements Sociaux (%)</label>
                    <input type="number" step="0.1" placeholder="17.2" class="percentage" value="17.2" onchange="updateContractCalculations(this)" oninput="updateContractCalculations(this)">
                </div>
                <div class="form-group">
                    <label>Exonération IR</label>
                    <select onchange="toggleIRExemption(this)">
                        <option value="non">Non</option>
                        <option value="oui">Oui (>8 ans, etc.)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Exonération PS</label>
                    <select onchange="updateContractCalculations(this)">
                        <option value="non">Non</option>
                        <option value="oui">Oui</option>
                    </select>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div class="form-group">
                    <label>Plus-value estimée (€)</label>
                    <input type="number" placeholder="8000" class="euro" onchange="updateContractCalculations(this)" oninput="updateContractCalculations(this)" onkeyup="updateContractCalculations(this)">
                </div>
                <div class="form-group">
                    <label>Type de sortie</label>
                    <select>
                        <option>Capital</option>
                        <option>Rente</option>
                        <option>Mixte</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="font-weight: bold; color: #d63384;">Sortir ce contrat ?</label>
                    <select onchange="toggleContractExit(this)" style="border: 2px solid #d63384;">
                        <option value="non">❌ Non</option>
                        <option value="oui">✅ Oui</option>
                    </select>
                </div>
                <div class="contract-fees" style="background: #f8f9fa; padding: 10px; border-radius: 6px; text-align: center;">
                    <small style="color: #6c757d;">Frais de sortie</small><br>
                    <strong class="fees-amount" style="color: #dc3545;">0 €</strong>
                </div>
            </div>
        </div>
        <button onclick="this.parentElement.remove(); calculateExitFees();" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; margin-top: 15px;">🗑️ Supprimer ce contrat</button>
    `;
    contractsList.appendChild(newContract);
}

// Toggle exonération IR - VERSION CORRIGÉE
function toggleIRExemption(select) {
    const contractItem = select.closest('.contract-management-item');
    const irInput = contractItem.querySelector('input[placeholder="12.8"]');
    
    if (select.value === 'oui') {
        irInput.value = 0;
        irInput.style.background = '#e8f5e8';
        irInput.setAttribute('readonly', true);
    } else {
        irInput.removeAttribute('readonly');
        irInput.style.background = 'white';
        if (irInput.value == 0) {
            irInput.value = '12.8'; // Remettre la valeur par défaut
        }
    }
    
    // Déclencher le recalcul
    updateContractCalculations(select);
}

// Toggle sortie de contrat - VERSION CORRIGÉE
function toggleContractExit(select) {
    const contractItem = select.closest('.contract-management-item');
    
    if (select.value === 'oui') {
        contractItem.classList.add('selected-for-exit');
    } else {
        contractItem.classList.remove('selected-for-exit');
    }
    
    // Déclencher le recalcul immédiatement
    updateContractCalculations(select);
}

// Mise à jour des calculs pour un contrat - VERSION CORRIGÉE
function updateContractCalculations(element) {
    const contractItem = element.closest('.contract-management-item');
    if (!contractItem) return;
    
    // Récupération des valeurs avec sélecteurs ULTRA robustes
    const montantInput = contractItem.querySelector('.contract-header input[type="number"]');
    
    // Recherche du champ plus-value avec plusieurs méthodes
    let plusValueInput = contractItem.querySelector('input[placeholder*="estimée"]');
    if (!plusValueInput) {
        plusValueInput = contractItem.querySelector('input[placeholder*="8000"]');
    }
    if (!plusValueInput) {
        plusValueInput = contractItem.querySelector('input[placeholder*="15000"]');
    }
    if (!plusValueInput) {
        // Méthode de dernier recours : chercher par position
        const allNumberInputs = contractItem.querySelectorAll('input[type="number"]');
        console.log(`Nombre d'inputs trouvés: ${allNumberInputs.length}`);
        allNumberInputs.forEach((input, index) => {
            console.log(`Input ${index}: placeholder="${input.placeholder}", value="${input.value}"`);
        });
        
        // Le champ plus-value est souvent le 4ème champ number (index 3)
        if (allNumberInputs.length >= 4) {
            plusValueInput = allNumberInputs[3];
            console.log('Plus-value trouvée par position:', plusValueInput.placeholder);
        }
    }
    
    const irInput = contractItem.querySelector('input[placeholder="12.8"]');
    const psInput = contractItem.querySelector('input[placeholder="17.2"]');
    const exonerationIRSelect = contractItem.querySelector('select[onchange*="toggleIR"]');
    const exonerationPSSelect = contractItem.querySelectorAll('select[onchange*="updateContract"]')[0];
    
    console.log('Éléments trouvés:', {
        montantInput: !!montantInput,
        plusValueInput: !!plusValueInput,
        plusValuePlaceholder: plusValueInput ? plusValueInput.placeholder : 'non trouvé',
        irInput: !!irInput,
        psInput: !!psInput
    });
    
    if (!montantInput || !plusValueInput || !irInput || !psInput) {
        console.log('Éléments manquants pour le calcul');
        console.log('HTML du contrat:', contractItem.innerHTML);
        return;
    }
    
    const montant = parseFloat(montantInput.value) || 0;
    const plusValue = parseFloat(plusValueInput.value) || 0;
    
    console.log('Valeurs lues:', { montant, plusValue });
    
    // Récupération des taux avec gestion des exonérations
    let tauxIR = parseFloat(irInput.value) || 0;
    let tauxPS = parseFloat(psInput.value) || 0;
    
    if (exonerationIRSelect && exonerationIRSelect.value === 'oui') tauxIR = 0;
    if (exonerationPSSelect && exonerationPSSelect.value === 'oui') tauxPS = 0;
    
    // Calcul des frais
    const fraisIR = plusValue * (tauxIR / 100);
    const fraisPS = plusValue * (tauxPS / 100);
    const fraisTotal = fraisIR + fraisPS;
    
    console.log('Calculs:', { tauxIR, tauxPS, fraisIR, fraisPS, fraisTotal });
    
    // Mise à jour de l'affichage
    const feesDisplay = contractItem.querySelector('.fees-amount');
    if (feesDisplay) {
        feesDisplay.textContent = `${Math.round(fraisTotal).toLocaleString()} €`;
        
        // Couleur selon les frais
        if (fraisTotal === 0) {
            feesDisplay.style.color = '#28a745';
        } else if (fraisTotal < 1000) {
            feesDisplay.style.color = '#fd7e14';
        } else {
            feesDisplay.style.color = '#dc3545';
        }
    }
}

// Calcul des frais totaux de sortie - VERSION CORRIGÉE
function calculateExitFees() {
    console.log('=== DÉBUT CALCUL FRAIS DE SORTIE ===');
    
    const contractItems = document.querySelectorAll('.contract-management-item');
    console.log(`Nombre de contrats trouvés: ${contractItems.length}`);
    
    let totalFees = 0;
    let totalCapitalRecupere = 0;
    let detailsContracts = [];
    
    contractItems.forEach((item, index) => {
        console.log(`\n--- Analyse du contrat ${index + 1} ---`);
        
        // Vérification si le contrat est sélectionné pour sortie
        const sortirSelect = item.querySelector('select[onchange*="toggleContract"]');
        const sortir = sortirSelect ? sortirSelect.value === 'oui' : false;
        
        console.log(`Contrat ${index + 1} - Sortir: ${sortir}`);
        
        if (sortir) {
            // Récupération des données avec sélecteurs améliorés
            const nomInput = item.querySelector('.contract-header input[type="text"]');
            const montantInput = item.querySelector('.contract-header input[type="number"]');
            const plusValueInputs = item.querySelectorAll('input[type="number"]');
            
            // Le champ plus-value est généralement le 4ème input number dans la structure
            let plusValueInput = null;
            for (let input of plusValueInputs) {
                if (input.placeholder && (input.placeholder.includes('estimée') || input.placeholder.includes('8000'))) {
                    plusValueInput = input;
                    break;
                }
            }
            
            // Si pas trouvé par placeholder, prendre le 4ème input number
            if (!plusValueInput && plusValueInputs.length >= 4) {
                plusValueInput = plusValueInputs[3]; // Index 3 = 4ème élément
            }
            
            const irInput = item.querySelector('input[placeholder="12.8"]');
            const psInput = item.querySelector('input[placeholder="17.2"]');
            const exonerationIRSelect = item.querySelector('select[onchange*="toggleIR"]');
            const exonerationPSSelects = item.querySelectorAll('select[onchange*="updateContract"]');
            const exonerationPSSelect = exonerationPSSelects.length > 0 ? exonerationPSSelects[0] : null;
            
            const nom = nomInput ? nomInput.value || `Contrat ${index + 1}` : `Contrat ${index + 1}`;
            const montant = montantInput ? parseFloat(montantInput.value) || 0 : 0;
            const plusValue = plusValueInput ? parseFloat(plusValueInput.value) || 0 : 0;
            
            console.log(`Données extraites:`, {
                nom,
                montant,
                plusValue,
                plusValueInput: !!plusValueInput,
                irInput: !!irInput,
                psInput: !!psInput
            });
            
            let tauxIR = irInput ? parseFloat(irInput.value) || 0 : 0;
            let tauxPS = psInput ? parseFloat(psInput.value) || 0 : 0;
            
            const exonerationIR = exonerationIRSelect ? exonerationIRSelect.value === 'oui' : false;
            const exonerationPS = exonerationPSSelect ? exonerationPSSelect.value === 'oui' : false;
            
            if (exonerationIR) tauxIR = 0;
            if (exonerationPS) tauxPS = 0;
            
            const fraisIR = plusValue * (tauxIR / 100);
            const fraisPS = plusValue * (tauxPS / 100);
            const fraisContrat = fraisIR + fraisPS;
            const capitalNet = montant - fraisContrat;
            
            console.log(`Calculs finaux:`, {
                tauxIR: `${tauxIR}%`,
                tauxPS: `${tauxPS}%`,
                fraisIR: `${fraisIR}€`,
                fraisPS: `${fraisPS}€`,
                fraisContrat: `${fraisContrat}€`,
                capitalNet: `${capitalNet}€`
            });
            
            totalFees += fraisContrat;
            totalCapitalRecupere += capitalNet;
            
            detailsContracts.push({
                nom,
                montant,
                plusValue,
                tauxIR,
                tauxPS,
                fraisIR,
                fraisPS,
                fraisContrat,
                capitalNet,
                exonerationIR,
                exonerationPS
            });
        }
    });
    
    console.log(`\n=== RÉSULTATS GLOBAUX ===`);
    console.log(`Total des frais: ${totalFees}€`);
    console.log(`Capital récupéré: ${totalCapitalRecupere}€`);
    console.log(`Nombre de contrats sélectionnés: ${detailsContracts.length}`);
    
    // Affichage des résultats
    if (detailsContracts.length === 0) {
        document.getElementById('feesBreakdown').innerHTML = `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
                <h5 style="color: #856404; margin-bottom: 15px;">⚠️ Aucun contrat sélectionné pour sortie</h5>
                <p style="margin: 0; color: #856404;">Veuillez :</p>
                <ol style="margin: 10px 0; text-align: left; display: inline-block;">
                    <li>Remplir les informations des contrats</li>
                    <li>Sélectionner "✅ Oui" sur les contrats à liquider</li>
                    <li>Cliquer de nouveau sur "Calculer les frais"</li>
                </ol>
            </div>
        `;
        document.getElementById('netAmountAvailable').innerHTML = '';
    } else {
        let breakdownHTML = `
            <h5 style="color: #2c3e50; margin-bottom: 15px;">📊 Détail par Contrat (${detailsContracts.length} contrat(s) sélectionné(s))</h5>
            <div style="display: grid; gap: 15px;">
        `;
        
        detailsContracts.forEach((contrat, index) => {
            breakdownHTML += `
                <div style="background: white; border: 2px solid #28a745; border-radius: 8px; padding: 15px;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 15px; align-items: center;">
                        <div>
                            <strong style="color: #2c3e50; font-size: 1.1em;">${contrat.nom}</strong><br>
                            <span style="color: #28a745;">💰 Capital: ${contrat.montant.toLocaleString()} €</span><br>
                            <span style="color: #6c757d;">📈 Plus-value: ${contrat.plusValue.toLocaleString()} €</span>
                        </div>
                        <div style="text-align: center; background: #ffebee; padding: 10px; border-radius: 6px;">
                            <strong style="color: #dc3545; font-size: 1.1em;">${Math.round(contrat.fraisIR).toLocaleString()} €</strong><br>
                            <small style="color: #6c757d;">IR ${contrat.tauxIR}%</small>
                            ${contrat.exonerationIR ? '<br><span style="color: #28a745; font-size: 0.8em;">✅ Exonéré</span>' : ''}
                        </div>
                        <div style="text-align: center; background: #fff3e0; padding: 10px; border-radius: 6px;">
                            <strong style="color: #fd7e14; font-size: 1.1em;">${Math.round(contrat.fraisPS).toLocaleString()} €</strong><br>
                            <small style="color: #6c757d;">PS ${contrat.tauxPS}%</small>
                            ${contrat.exonerationPS ? '<br><span style="color: #28a745; font-size: 0.8em;">✅ Exonéré</span>' : ''}
                        </div>
                        <div style="text-align: center; background: #e8f5e8; padding: 10px; border-radius: 6px; border: 2px solid #28a745;">
                            <strong style="color: #2e7d32; font-size: 1.2em;">${Math.round(contrat.capitalNet).toLocaleString()} €</strong><br>
                            <small style="color: #6c757d; font-weight: bold;">NET RÉCUPÉRÉ</small>
                        </div>
                    </div>
                </div>
            `;
        });
        
        breakdownHTML += `</div>`;
        
        document.getElementById('feesBreakdown').innerHTML = breakdownHTML;
        
        // Récapitulatif global amélioré
        const tauxFraisGlobal = totalFees > 0 ? (totalFees / (totalCapitalRecupere + totalFees)) * 100 : 0;
        
        document.getElementById('netAmountAvailable').innerHTML = `
            <div style="margin-top: 25px; background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 25px rgba(40, 167, 69, 0.3);">
                <h5 style="color: white; margin-bottom: 25px; text-align: center; font-size: 1.4em;">💰 Récapitulatif de la Liquidation</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 25px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
                        <div style="font-size: 2em; font-weight: bold; margin-bottom: 8px;">${Math.round(totalCapitalRecupere).toLocaleString()} €</div>
                        <div style="opacity: 0.9; font-size: 1.1em;">💵 Capital net récupéré</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
                        <div style="font-size: 2em; font-weight: bold; margin-bottom: 8px;">${Math.round(totalFees).toLocaleString()} €</div>
                        <div style="opacity: 0.9; font-size: 1.1em;">💸 Total frais fiscaux</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
                        <div style="font-size: 2em; font-weight: bold; margin-bottom: 8px;">${Math.round(tauxFraisGlobal)}%</div>
                        <div style="opacity: 0.9; font-size: 1.1em;">📊 Taux de frais global</div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; text-align: center;">
                    <strong style="font-size: 1.1em;">🎯 ${detailsContracts.length} contrat(s) liquidé(s) sur ${contractItems.length} contrat(s) total</strong>
                </div>
            </div>
        `;
    }
    
    document.getElementById('exitFeesResult').classList.add('show');
    console.log('=== FIN CALCUL FRAIS DE SORTIE ===');
}

// Mise à jour du rappel de déficit
function updateDeficitRecap() {
    // Cette fonction sera appelée depuis l'onglet finances pour transmettre le déficit
    const deficitRecap = document.getElementById('deficitRecap');
    const deficitAmount = document.getElementById('deficitAmount');
    
    // Récupération du déficit depuis le calcul précédent (si disponible)
    const budgetResult = document.getElementById('budgetResult');
    if (budgetResult.classList.contains('show')) {
        deficitRecap.style.display = 'block';
        deficitAmount.textContent = 'Pensez à calculer votre déficit dans l\'onglet "Situation Financière" pour connaître le montant à combler.';
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Événement pour le calcul automatique du temps de retraite
    const dateRetraite1 = document.getElementById('dateRetraite1');
    if (dateRetraite1) {
        dateRetraite1.addEventListener('change', () => calculateTimeToRetirement(1));
    }
    
    // Sauvegarde automatique sur changement
    document.addEventListener('input', function(e) {
        if (e.target.matches('input, select')) {
            // Debounce pour éviter trop d'appels
            clearTimeout(window.saveTimeout);
            window.saveTimeout = setTimeout(saveData, 1000);
        }
    });
    
    // Chargement des données sauvegardées
    loadData();
    
    // Mise à jour du récapitulatif de déficit au changement d'onglet
    document.addEventListener('click', function(e) {
        if (e.target.matches('.tab') && e.target.textContent.includes('Gestion des Sorties')) {
            setTimeout(updateDeficitRecap, 100);
        }
    });
    
    console.log('Application initialisée avec succès !');
});

// Fonctions de sauvegarde et chargement (optionnelles)
function saveData() {
    // Cette fonction peut être implémentée pour sauvegarder les données
    console.log('Sauvegarde des données...');
}

function loadData() {
    // Cette fonction peut être implémentée pour charger les données sauvegardées
    console.log('Chargement des données...');
}