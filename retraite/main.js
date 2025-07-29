// Variables globales - DOIT être déclaré en premier
let isCouple = false;

// Barème impôt sur le revenu 2025 (tranches en euros)
const BAREME_IR_2025 = [
    { min: 0, max: 11294, taux: 0 },
    { min: 11294, max: 28797, taux: 0.11 },
    { min: 28797, max: 82341, taux: 0.30 },
    { min: 82341, max: 177106, taux: 0.41 },
    { min: 177106, max: Infinity, taux: 0.45 }
];

// Variables globales pour la projection
let projectionData = {
    deficitMensuel: 0,
    deficitAnnuel: 0,
    capitalDisponible: 0,
    revenusRentes: 0,
    contractsRentes: [],
    contractsCapital: [],
    dateDebutRetraite: null
};

// ==============================================
// FONCTIONS DE CALCUL D'IMPÔTS
// ==============================================

// Calcul de l'impôt sur le revenu
function calculerImpotRevenu(revenuAnnuelBrut, nbParts) {
    const quotientFamilial = revenuAnnuelBrut / nbParts;
    
    let impotQuotient = 0;
    
    for (let tranche of BAREME_IR_2025) {
        if (quotientFamilial > tranche.min) {
            const baseImposable = Math.min(quotientFamilial, tranche.max) - tranche.min;
            impotQuotient += baseImposable * tranche.taux;
        }
    }
    
    let impotTotal = impotQuotient * nbParts;
    
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

function calculerTousLesImpots() {
    const revenus1 = (parseFloat(document.getElementById('revenus1').value) || 0) * 12;
    const revenusRetraite1 = (parseFloat(document.getElementById('revenusRetraite1').value) || 0) * 12;
    const revenusAutres = (parseFloat(document.getElementById('revenusAutres').value) || 0) * 12;
    const nbParts = parseFloat(document.getElementById('parts').value) || 1;
    
    let revenus2 = 0;
    let revenusRetraite2 = 0;
    let dateRetraite1 = null;
    let dateRetraite2 = null;
    
    if (isCouple) {
        const revenus2Element = document.getElementById('revenus2');
        const revenusRetraite2Element = document.getElementById('revenusRetraite2');
        const dateRetraite1Element = document.getElementById('dateRetraite1');
        const dateRetraite2Element = document.getElementById('dateRetraite2');
        
        if (revenus2Element) revenus2 = (parseFloat(revenus2Element.value) || 0) * 12;
        if (revenusRetraite2Element) revenusRetraite2 = (parseFloat(revenusRetraite2Element.value) || 0) * 12;
        if (dateRetraite1Element) dateRetraite1 = new Date(dateRetraite1Element.value);
        if (dateRetraite2Element) dateRetraite2 = new Date(dateRetraite2Element.value);
    }
    
    const revenusTotalActuels = revenus1 + revenus2 + revenusAutres;
    const revenusTotalRetraite = revenusRetraite1 + revenusRetraite2 + revenusAutres;
    
    const impotActuel = calculerImpotRevenu(revenusTotalActuels, nbParts);
    const impotRetraite = calculerImpotRevenu(revenusTotalRetraite, nbParts);
    
    let impotEntreDeuxRetraites = null;
    let periodeEntreDeuxRetraites = null;
    
    if (isCouple && dateRetraite1 && dateRetraite2 && dateRetraite1.getTime() !== dateRetraite2.getTime()) {
        let revenusEntreDeuxRetraites;
        
        if (dateRetraite1 < dateRetraite2) {
            revenusEntreDeuxRetraites = revenusRetraite1 + revenus2 + revenusAutres;
            periodeEntreDeuxRetraites = `Du ${dateRetraite1.toLocaleDateString('fr-FR')} au ${dateRetraite2.toLocaleDateString('fr-FR')}`;
        } else {
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

// ==============================================
// CALCUL DU BUDGET ET DÉFICIT
// ==============================================

function calculateBudget() {
    console.log('🔍 Calcul du budget démarré');
    
    try {
        // Récupération des données client 1
        const revenus1 = parseFloat(document.getElementById('revenus1').value) || 0;
        const revenusRetraite1 = parseFloat(document.getElementById('revenusRetraite1').value) || 0;
        
        // Récupération des données client 2 si couple
        let revenus2 = 0;
        let revenusRetraite2 = 0;
        if (isCouple) {
            const revenus2Element = document.getElementById('revenus2');
            const revenusRetraite2Element = document.getElementById('revenusRetraite2');
            if (revenus2Element) revenus2 = parseFloat(revenus2Element.value) || 0;
            if (revenusRetraite2Element) revenusRetraite2 = parseFloat(revenusRetraite2Element.value) || 0;
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
        
        console.log('✅ Calcul du budget terminé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur dans calculateBudget:', error);
        document.getElementById('deficitText').innerHTML = `<p style="color: red;">Erreur lors du calcul : ${error.message}</p>`;
        document.getElementById('budgetResult').classList.add('show');
    }
}

// ==============================================
// CALCUL DES FRAIS DE SORTIE
// ==============================================

function calculateExitFees() {
    const contractItems = document.querySelectorAll('.contract-management-item');
    
    let totalFees = 0;
    let totalCapitalRecupere = 0;
    let detailsContracts = [];
    
    contractItems.forEach((item, index) => {
        const sortirSelect = item.querySelector('select[onchange*="toggleContract"]');
        const sortir = sortirSelect ? sortirSelect.value === 'oui' : false;
        
        if (sortir) {
            const nomInput = item.querySelector('.contract-header input[type="text"]');
            const montantInput = item.querySelector('.contract-header input[type="number"]');
            const plusValueInputs = item.querySelectorAll('input[type="number"]');
            
            let plusValueInput = null;
            for (let input of plusValueInputs) {
                if (input.placeholder && (input.placeholder.includes('estimée') || input.placeholder.includes('8000'))) {
                    plusValueInput = input;
                    break;
                }
            }
            
            if (!plusValueInput && plusValueInputs.length >= 4) {
                plusValueInput = plusValueInputs[3];
            }
            
            const irInput = item.querySelector('input[placeholder="12.8"]');
            const psInput = item.querySelector('input[placeholder="17.2"]');
            const exonerationIRSelect = item.querySelector('select[onchange*="toggleIR"]');
            const exonerationPSSelects = item.querySelectorAll('select[onchange*="updateContract"]');
            const exonerationPSSelect = exonerationPSSelects.length > 0 ? exonerationPSSelects[0] : null;
            
            const nom = nomInput ? nomInput.value || `Contrat ${index + 1}` : `Contrat ${index + 1}`;
            const montant = montantInput ? parseFloat(montantInput.value) || 0 : 0;
            const plusValue = plusValueInput ? parseFloat(plusValueInput.value) || 0 : 0;
            
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
        
        detailsContracts.forEach((contrat) => {
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
}

// ==============================================
// FONCTIONS DE PROJECTION (ONGLET 4)
// ==============================================

// Fonction collectProjectionData corrigée
function collectProjectionData() {
    console.log('=== COLLECTE DES DONNÉES POUR PROJECTION ===');
    
    try {
        // Réinitialisation des données de projection
        projectionData = {
            deficitMensuel: 0,
            deficitAnnuel: 0,
            capitalDisponible: 0,
            revenusRentes: 0,
            contractsRentes: [],
            contractsCapital: [],
            dateDebutRetraite: null
        };
        
        // 1. Récupération du déficit depuis l'onglet 2
        const budgetResult = document.getElementById('budgetResult');
        if (budgetResult && budgetResult.classList.contains('show')) {
            const deficitText = document.getElementById('deficitText');
            if (deficitText) {
                const deficitHTML = deficitText.innerHTML;
                const deficitMatch = deficitHTML.match(/(\d+[\d\s,]*)\s*€[\s\/]*mois/);
                if (deficitMatch) {
                    projectionData.deficitMensuel = parseInt(deficitMatch[1].replace(/[\s,]/g, ''));
                    projectionData.deficitAnnuel = projectionData.deficitMensuel * 12;
                }
            }
        }
        
        // 2. Récupération des contrats et capital depuis l'onglet 3
        const contractItems = document.querySelectorAll('.contract-management-item');
        console.log(`Contrats trouvés: ${contractItems.length}`);
        
        contractItems.forEach((item, index) => {
            const sortirSelect = item.querySelector('select[onchange*="toggleContract"]');
            const sortir = sortirSelect ? sortirSelect.value === 'oui' : false;
            
            if (sortir) {
                const nomInput = item.querySelector('.contract-header input[type="text"]');
                const montantInput = item.querySelector('.contract-header input[type="number"]');
                const typeSortieSelects = item.querySelectorAll('select');
                let typeSortie = 'Capital';
                
                // Trouver le select du type de sortie de manière plus robuste
                for (let select of typeSortieSelects) {
                    const selectedOption = select.options[select.selectedIndex];
                    if (selectedOption && (selectedOption.text === 'Capital' || selectedOption.text === 'Rente' || selectedOption.text === 'Mixte')) {
                        typeSortie = selectedOption.text;
                        break;
                    }
                }
                
                const nom = nomInput ? nomInput.value || `Contrat ${index + 1}` : `Contrat ${index + 1}`;
                const montant = montantInput ? parseFloat(montantInput.value) || 0 : 0;
                
                const feesDisplay = item.querySelector('.fees-amount');
                const frais = feesDisplay ? parseInt(feesDisplay.textContent.replace(/[^\d]/g, '')) || 0 : 0;
                const montantNet = montant - frais;
                
                const contractData = {
                    nom,
                    montantBrut: montant,
                    frais,
                    montantNet,
                    typeSortie
                };
                
                if (typeSortie === 'Rente') {
                    // Estimation du revenu de rente (4% du capital)
                    const revenuAnnuel = montantNet * 0.04;
                    contractData.revenuAnnuel = revenuAnnuel;
                    contractData.revenuMensuel = revenuAnnuel / 12;
                    
                    projectionData.contractsRentes.push(contractData);
                    projectionData.revenusRentes += contractData.revenuMensuel;
                } else {
                    projectionData.contractsCapital.push(contractData);
                    projectionData.capitalDisponible += montantNet;
                }
                
                console.log(`Contrat traité: ${nom}, Type: ${typeSortie}, Montant net: ${montantNet}`);
            }
        });
        
        // 3. Date de début de retraite
        const dateRetraite1Element = document.getElementById('dateRetraite1');
        const dateRetraite2Element = document.getElementById('dateRetraite2');
        
        if (dateRetraite1Element && dateRetraite1Element.value) {
            projectionData.dateDebutRetraite = new Date(dateRetraite1Element.value);
            
            if (isCouple && dateRetraite2Element && dateRetraite2Element.value) {
                const date2 = new Date(dateRetraite2Element.value);
                if (date2 < projectionData.dateDebutRetraite) {
                    projectionData.dateDebutRetraite = date2;
                }
            }
        }
        
        console.log('Données collectées:', projectionData);
        return projectionData;
        
    } catch (error) {
        console.error('❌ Erreur dans collectProjectionData:', error);
        // Retourner des données par défaut en cas d'erreur
        return {
            deficitMensuel: 0,
            deficitAnnuel: 0,
            capitalDisponible: 0,
            revenusRentes: 0,
            contractsRentes: [],
            contractsCapital: [],
            dateDebutRetraite: null
        };
    }
}

// Fonction calculateProjection corrigée avec vérifications
function calculateProjection() {
    console.log('=== DÉBUT CALCUL PROJECTION ===');
    
    try {
        // Vérification des éléments DOM essentiels
        const strategyOverview = document.getElementById('strategyOverview');
        const projectionTable = document.getElementById('projectionTable');
        const recommendations = document.getElementById('recommendations');
        const projectionResult = document.getElementById('projectionResult');
        
        if (!strategyOverview || !projectionTable || !recommendations || !projectionResult) {
            console.error('❌ Éléments DOM manquants pour la projection');
            console.log('Éléments trouvés:', {
                strategyOverview: !!strategyOverview,
                projectionTable: !!projectionTable,
                recommendations: !!recommendations,
                projectionResult: !!projectionResult
            });
            
            // Créer une alerte pour l'utilisateur
            alert('Erreur: Certains éléments de l\'onglet Projection sont manquants. Vérifiez votre fichier HTML.');
            return;
        }

        // Collecte des données et paramètres
        updateProjectionRecap();
        const data = collectProjectionData();
        
        const rendementReplacement = (parseFloat(document.getElementById('rendementReplacement').value) || 3.5) / 100;
        const inflationRate = (parseFloat(document.getElementById('inflationRate').value) || 2.0) / 100;
        const ageEsperanceVie = parseInt(document.getElementById('ageEsperanceVie').value) || 85;
        
        const deficitApresRentes = Math.max(0, data.deficitMensuel - data.revenusRentes);
        const deficitAnnuelApresRentes = deficitApresRentes * 12;
        
        // Génération des différentes sections
        let strategyHTML = generateStrategyOverview(data, deficitApresRentes);
        strategyOverview.innerHTML = strategyHTML;
        
        if (data.dateDebutRetraite && (data.capitalDisponible > 0 || data.revenusRentes > 0)) {
            const projectionTableHTML = generateProjectionTable(data, deficitAnnuelApresRentes, rendementReplacement, inflationRate, ageEsperanceVie);
            projectionTable.innerHTML = projectionTableHTML;
            
            const recommendationsHTML = generateRecommendations(data, deficitApresRentes, rendementReplacement);
            recommendations.innerHTML = recommendationsHTML;
        } else {
            projectionTable.innerHTML = `
                <div class="strategy-alert warning">
                    <h5>⚠️ Données incomplètes</h5>
                    <p>Veuillez compléter les onglets précédents pour générer la projection :</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Définir votre date de retraite (onglet 1)</li>
                        <li>Calculer votre déficit (onglet 2)</li>
                        <li>Sélectionner vos contrats à liquider (onglet 3)</li>
                    </ul>
                </div>
            `;
        }
        
        projectionResult.classList.add('show');
        console.log('=== FIN CALCUL PROJECTION ===');
        
    } catch (error) {
        console.error('❌ Erreur dans calculateProjection:', error);
    }
}

// Fonction updateProjectionRecap corrigée
function updateProjectionRecap() {
    try {
        const data = collectProjectionData();
        
        const deficitProjectionElement = document.getElementById('deficitProjection');
        const capitalProjectionElement = document.getElementById('capitalProjection');
        const rentesProjectionElement = document.getElementById('rentesProjection');
        
        if (deficitProjectionElement && data.deficitMensuel > 0) {
            deficitProjectionElement.innerHTML = `
                <div>${data.deficitMensuel.toLocaleString()} € / mois</div>
                <small style="opacity: 0.8;">${data.deficitAnnuel.toLocaleString()} € / an</small>
            `;
        }
        
        if (capitalProjectionElement && data.capitalDisponible > 0) {
            const nbAnneesCouverture = data.deficitAnnuel > 0 ? (data.capitalDisponible / data.deficitAnnuel).toFixed(1) : '∞';
            capitalProjectionElement.innerHTML = `
                <div>${data.capitalDisponible.toLocaleString()} €</div>
                <small style="opacity: 0.8;">≈ ${nbAnneesCouverture} années de couverture</small>
            `;
        }
        
        if (rentesProjectionElement && data.revenusRentes > 0) {
            rentesProjectionElement.innerHTML = `
                <div>${Math.round(data.revenusRentes).toLocaleString()} € / mois</div>
                <small style="opacity: 0.8;">${Math.round(data.revenusRentes * 12).toLocaleString()} € / an</small>
            `;
        }
        
    } catch (error) {
        console.error('❌ Erreur dans updateProjectionRecap:', error);
    }
}

function generateStrategyOverview(data, deficitApresRentes) {
    let html = `<h5 style="color: #2c3e50; margin-bottom: 20px;">🎯 Aperçu de la Stratégie de Comblement</h5>`;
    
    if (data.revenusRentes > 0) {
        const couvertureRentes = (data.revenusRentes / data.deficitMensuel) * 100;
        const alertClass = couvertureRentes >= 100 ? 'success' : couvertureRentes >= 50 ? 'warning' : 'danger';
        
        html += `
            <div class="strategy-alert ${alertClass}">
                <h6>📈 Couverture par les Rentes</h6>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                    <div>
                        <strong>Revenus de rentes :</strong><br>
                        <span style="font-size: 1.2em;">${Math.round(data.revenusRentes).toLocaleString()} € / mois</span>
                    </div>
                    <div>
                        <strong>Couverture du déficit :</strong><br>
                        <span style="font-size: 1.2em;">${Math.round(couvertureRentes)}%</span>
                    </div>
                    <div>
                        <strong>Déficit restant :</strong><br>
                        <span style="font-size: 1.2em; color: ${deficitApresRentes > 0 ? '#dc3545' : '#28a745'};">
                            ${Math.round(deficitApresRentes).toLocaleString()} € / mois
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (data.capitalDisponible > 0 && deficitApresRentes > 0) {
        const anneesCouverte = data.capitalDisponible / (deficitApresRentes * 12);
        const alertClass = anneesCouverte >= 20 ? 'success' : anneesCouverte >= 10 ? 'warning' : 'danger';
        
        html += `
            <div class="strategy-alert ${alertClass}">
                <h6>💰 Utilisation du Capital</h6>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                    <div>
                        <strong>Capital disponible :</strong><br>
                        <span style="font-size: 1.2em;">${data.capitalDisponible.toLocaleString()} €</span>
                    </div>
                    <div>
                        <strong>Prélèvement annuel :</strong><br>
                        <span style="font-size: 1.2em;">${Math.round(deficitApresRentes * 12).toLocaleString()} €</span>
                    </div>
                    <div>
                        <strong>Durée de couverture :</strong><br>
                        <span style="font-size: 1.2em; font-weight: bold;">
                            ${anneesCouverte.toFixed(1)} années
                        </span>
                    </div>
                </div>
            </div>
        `;
    } else if (deficitApresRentes <= 0) {
        html += `
            <div class="strategy-alert success">
                <h6>🎉 Situation Optimale</h6>
                <p style="margin: 10px 0;">Vos revenus de rentes couvrent entièrement votre déficit ! Le capital disponible de <strong>${data.capitalDisponible.toLocaleString()} €</strong> peut être replacé pour optimiser votre patrimoine.</p>
            </div>
        `;
    }
    
    return html;
}

function generateProjectionTable(data, deficitAnnuelApresRentes, rendementReplacement, inflationRate, ageEsperanceVie) {
    if (deficitAnnuelApresRentes <= 0) {
        return `
            <div class="strategy-alert success">
                <h5>✅ Aucun Prélèvement Nécessaire</h5>
                <p>Vos revenus de rentes suffisent à couvrir le déficit. Le capital de <strong>${data.capitalDisponible.toLocaleString()} €</strong> peut être entièrement replacé pour faire fructifier votre patrimoine.</p>
            </div>
        `;
    }
    
    const anneeActuelle = new Date().getFullYear();
    const anneeRetraite = data.dateDebutRetraite ? data.dateDebutRetraite.getFullYear() : anneeActuelle;
    const ageActuel = parseInt(document.getElementById('age1').value) || 35;
    const ageRetraite = ageActuel + (anneeRetraite - anneeActuelle);
    
    let html = `
        <h5 style="color: #2c3e50; margin-bottom: 20px;">📅 Projection Année par Année</h5>
        <div style="overflow-x: auto;">
            <table class="projection-table">
                <thead>
                    <tr>
                        <th>Année</th>
                        <th>Âge</th>
                        <th>Capital Début</th>
                        <th>Rendement</th>
                        <th>Prélèvement</th>
                        <th>Capital Fin</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let capitalRestant = data.capitalDisponible;
    let deficitAjuste = deficitAnnuelApresRentes;
    
    for (let annee = anneeRetraite; annee <= anneeRetraite + (ageEsperanceVie - ageRetraite); annee++) {
        const age = ageRetraite + (annee - anneeRetraite);
        const capitalDebut = capitalRestant;
        
        const rendementAnnuel = capitalRestant * rendementReplacement;
        
        const anneesDepuisRetraite = annee - anneeRetraite;
        const deficitAvecInflation = deficitAjuste * Math.pow(1 + inflationRate, anneesDepuisRetraite);
        
        const prelevementAnnuel = Math.min(deficitAvecInflation, capitalRestant + rendementAnnuel);
        
        capitalRestant = Math.max(0, capitalRestant + rendementAnnuel - prelevementAnnuel);
        
        let statut, classe;
        if (capitalRestant === 0 && prelevementAnnuel < deficitAvecInflation) {
            statut = "📉 Capital épuisé";
            classe = "capital-depleted";
        } else if (capitalRestant > deficitAvecInflation * 3) {
            statut = "💚 Très confortable";
            classe = "capital-high";
        } else if (capitalRestant > deficitAvecInflation) {
            statut = "🟡 Correct";
            classe = "capital-medium";
        } else {
            statut = "🔴 Attention";
            classe = "capital-low";
        }
        
        html += `
            <tr class="${classe}">
                <td><strong>${annee}</strong></td>
                <td>${age} ans</td>
                <td>${Math.round(capitalDebut).toLocaleString()} €</td>
                <td>+${Math.round(rendementAnnuel).toLocaleString()} €</td>
                <td>-${Math.round(prelevementAnnuel).toLocaleString()} €</td>
                <td><strong>${Math.round(capitalRestant).toLocaleString()} €</strong></td>
                <td>${statut}</td>
            </tr>
        `;
        
        if (capitalRestant === 0) {
            html += `
                <tr style="background: #f8d7da; font-style: italic;">
                    <td colspan="7" style="text-align: center; padding: 15px; color: #721c24;">
                        <strong>⚠️ Capital épuisé à ${age} ans (${annee}) - Déficit non couvert par la suite</strong>
                    </td>
                </tr>
            `;
            break;
        }
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 0.9em; color: #6c757d;">
            <strong>📝 Notes :</strong> Rendement ${(rendementReplacement*100).toFixed(1)}% | Inflation ${(inflationRate*100).toFixed(1)}% | 
            Prélèvements ajustés à l'inflation | Capital disponible pour replacement : ${data.contractsCapital.length} contrat(s)
        </div>
    `;
    
    return html;
}

function generateRecommendations(data, deficitApresRentes, rendementReplacement) {
    let html = `<h5 style="color: #2c3e50; margin-bottom: 20px;">💡 Recommandations Stratégiques</h5>`;
    
    const recommendations = [];
    
    if (data.revenusRentes === 0 && data.contractsCapital.length > 0) {
        recommendations.push({
            priority: 'high',
            title: '📈 Privilégier les Sorties en Rente',
            content: `Aucun contrat n'est prévu en sortie rente. Considérez convertir au moins ${Math.round(data.deficitMensuel * 300).toLocaleString()} € de capital en rente pour sécuriser ${Math.round(data.deficitMensuel * 0.8).toLocaleString()} €/mois de revenus garantis.`
        });
    }
    
    if (deficitApresRentes > 0) {
        const anneesCouverte = data.capitalDisponible / (deficitApresRentes * 12);
        if (anneesCouverte < 15) {
            recommendations.push({
                priority: 'high',
                title: '⚠️ Risque d\'Épuisement du Capital',
                content: `Votre capital ne couvre que ${anneesCouverte.toFixed(1)} années. Considérez : augmenter les rentes, réduire le train de vie de ${Math.round((deficitApresRentes * 0.3)).toLocaleString()} €/mois, ou reporter la retraite de 2-3 ans.`
            });
        } else if (anneesCouverte > 25) {
            recommendations.push({
                priority: 'low',
                title: '🎉 Situation Très Confortable',
                content: `Votre capital couvre ${anneesCouverte.toFixed(1)} années. Vous pourriez optimiser en augmentant votre train de vie ou en constituant un héritage.`
            });
        }
    }
    
    if (rendementReplacement < 0.03) {
        recommendations.push({
            priority: 'medium',
            title: '📊 Optimiser le Rendement',
            content: `Avec un rendement de ${(rendementReplacement*100).toFixed(1)}%, considérez diversifier vers des actifs plus performants (4-5%) pour prolonger la durée de votre capital.`
        });
    }
    
    if (data.contractsCapital.length === 1 && data.capitalDisponible > 50000) {
        recommendations.push({
            priority: 'medium',
            title: '🔄 Diversifier les Placements',
            content: `Avec ${data.capitalDisponible.toLocaleString()} € à replacer, diversifiez sur plusieurs supports : AV (60%), PER (20%), actions/ETF (20%) pour optimiser rendement et fiscalité.`
        });
    }
    
    recommendations.forEach(rec => {
        html += `
            <div class="recommendation-item priority-${rec.priority}">
                <h6 style="margin-bottom: 10px; color: #2c3e50;">${rec.title}</h6>
                <p style="margin: 0; line-height: 1.5;">${rec.content}</p>
            </div>
        `;
    });
    
    if (recommendations.length === 0) {
        html += `
            <div class="strategy-alert success">
                <h6>✅ Stratégie Optimale</h6>
                <p>Votre stratégie actuelle semble bien équilibrée. Surveillez régulièrement l'évolution de vos contrats et ajustez si nécessaire.</p>
            </div>
        `;
    }
    
    return html;
}

// Fonction initProjectionTab corrigée
function initProjectionTab() {
    try {
        updateProjectionRecap();
        
        const errors = validateProjectionData();
        const projectionResult = document.getElementById('projectionResult');
        
        if (errors.length > 0 && projectionResult) {
            projectionResult.innerHTML = `
                <div class="strategy-alert warning">
                    <h5>⚠️ Données Incomplètes</h5>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                    <p style="margin-top: 15px;"><strong>Complétez les onglets précédents puis cliquez sur "Calculer la Projection"</strong></p>
                </div>
            `;
            projectionResult.classList.add('show');
        }
        
    } catch (error) {
        console.error('❌ Erreur dans initProjectionTab:', error);
    }
}

// Fonction validateProjectionData corrigée
function validateProjectionData() {
    const errors = [];
    
    try {
        const data = collectProjectionData();
        
        if (data.deficitMensuel <= 0) {
            errors.push("Aucun déficit calculé - vérifiez l'onglet 'Situation Financière'");
        }
        
        if (data.capitalDisponible <= 0 && data.revenusRentes <= 0) {
            errors.push("Aucun contrat sélectionné pour sortie - vérifiez l'onglet 'Gestion des Sorties'");
        }
        
        if (!data.dateDebutRetraite) {
            errors.push("Date de retraite non définie - vérifiez l'onglet 'Informations Client'");
        }
        
    } catch (error) {
        console.error('❌ Erreur dans validateProjectionData:', error);
        errors.push("Erreur lors de la validation des données");
    }
    
    return errors;
}

// ==============================================
// GESTION DES ONGLETS ET INTERFACE
// ==============================================

function switchTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Mise à jour spécifique pour l'onglet projection
    if (tabName === 'projection') {
        setTimeout(() => {
            updateProjectionRecap();
            initProjectionTab();
        }, 100);
    }
}

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

// ==============================================
// GESTION DES CRÉDITS ET CONTRATS
// ==============================================

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
        tauxIR: 30,
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
                <select onchange="updateContractType(this)">
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
                <input type="number" placeholder="50000" class="euro" onchange="updateContractCalculations(this)">
            </div>
        </div>
        
        <div class="contract-details">
            <h6 style="color: #495057; margin-bottom: 15px;">🧾 Fiscalité et Sortie</h6>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                <div class="form-group">
                    <label>IR sur plus-values (%)</label>
                    <input type="number" step="0.1" placeholder="12.8" class="percentage" value="12.8" onchange="updateContractCalculations(this)">
                </div>
                <div class="form-group">
                    <label>Prélèvements Sociaux (%)</label>
                    <input type="number" step="0.1" placeholder="17.2" class="percentage" value="17.2" onchange="updateContractCalculations(this)">
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
                    <input type="number" placeholder="8000" class="euro" onchange="updateContractCalculations(this)">
                </div>
                <div class="form-group">
                    <label>Type de sortie</label>
                    <select onchange="updateContractCalculations(this)">
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

function updateContractType(selectElement) {
    const contractItem = selectElement.closest('.contract-management-item');
    const typeContrat = selectElement.value;
    const config = FISCALITE_CONTRATS[typeContrat];
    
    if (!config) return;
    
    const irInput = contractItem.querySelector('input[placeholder="12.8"]');
    const psInput = contractItem.querySelector('input[placeholder="17.2"]');
    
    if (irInput) {
        irInput.value = config.tauxIR;
        irInput.style.background = '#fff3cd';
        setTimeout(() => irInput.style.background = 'white', 1000);
    }
    
    if (psInput) {
        psInput.value = config.tauxPS;
        psInput.style.background = '#fff3cd';
        setTimeout(() => psInput.style.background = 'white', 1000);
    }
    
    if (typeContrat === "PER" && psInput) {
        psInput.value = 0;
        psInput.style.background = '#e8f5e8';
        psInput.setAttribute('readonly', true);
    } else if (psInput) {
        psInput.removeAttribute('readonly');
        psInput.style.background = 'white';
    }
    
    setTimeout(() => {
        updateContractCalculations(selectElement);
    }, 100);
}

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
            irInput.value = '12.8';
        }
    }
    
    updateContractCalculations(select);
}

function toggleContractExit(select) {
    const contractItem = select.closest('.contract-management-item');
    
    if (select.value === 'oui') {
        contractItem.classList.add('selected-for-exit');
    } else {
        contractItem.classList.remove('selected-for-exit');
    }
    
    updateContractCalculations(select);
}

function updateContractCalculations(element) {
    const contractItem = element.closest('.contract-management-item');
    if (!contractItem) return;
    
    const montantInput = contractItem.querySelector('.contract-header input[type="number"]');
    const allNumberInputs = contractItem.querySelectorAll('input[type="number"]');
    let plusValueInput = null;
    
    for (let input of allNumberInputs) {
        if (input.placeholder && (input.placeholder.includes('estimée') || input.placeholder.includes('8000'))) {
            plusValueInput = input;
            break;
        }
    }
    
    if (!plusValueInput && allNumberInputs.length >= 4) {
        plusValueInput = allNumberInputs[3];
    }
    
    const irInput = contractItem.querySelector('input[placeholder="12.8"]');
    const psInput = contractItem.querySelector('input[placeholder="17.2"]');
    const exonerationIRSelect = contractItem.querySelector('select[onchange*="toggleIR"]');
    const exonerationPSSelects = contractItem.querySelectorAll('select[onchange*="updateContract"]');
    const exonerationPSSelect = exonerationPSSelects.length > 0 ? exonerationPSSelects[0] : null;
    
    if (!montantInput || !plusValueInput || !irInput || !psInput) {
        return;
    }
    
    const montant = parseFloat(montantInput.value) || 0;
    const plusValue = parseFloat(plusValueInput.value) || 0;
    
    let tauxIR = parseFloat(irInput.value) || 0;
    let tauxPS = parseFloat(psInput.value) || 0;
    
    if (exonerationIRSelect && exonerationIRSelect.value === 'oui') tauxIR = 0;
    if (exonerationPSSelect && exonerationPSSelect.value === 'oui') tauxPS = 0;
    
    const fraisIR = plusValue * (tauxIR / 100);
    const fraisPS = plusValue * (tauxPS / 100);
    const fraisTotal = fraisIR + fraisPS;
    
    const feesDisplay = contractItem.querySelector('.fees-amount');
    if (feesDisplay) {
        feesDisplay.textContent = `${Math.round(fraisTotal).toLocaleString()} €`;
        
        if (fraisTotal === 0) {
            feesDisplay.style.color = '#28a745';
        } else if (fraisTotal < 1000) {
            feesDisplay.style.color = '#fd7e14';
        } else {
            feesDisplay.style.color = '#dc3545';
        }
    }
}

// ==============================================
// INITIALISATION ET EVENT LISTENERS
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    // Event listener pour le calcul du temps de retraite
    const dateRetraite1 = document.getElementById('dateRetraite1');
    if (dateRetraite1) {
        dateRetraite1.addEventListener('change', () => calculateTimeToRetirement(1));
    }
    
    // Sauvegarde automatique sur changement
    document.addEventListener('input', function(e) {
        if (e.target.matches('input, select')) {
            clearTimeout(window.saveTimeout);
            window.saveTimeout = setTimeout(saveData, 1000);
        }
    });
    
    // Event listeners pour l'onglet projection
    const projectionInputs = ['rendementReplacement', 'inflationRate', 'ageEsperanceVie'];
    projectionInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', function() {
                const projectionResult = document.getElementById('projectionResult');
                if (projectionResult && projectionResult.classList.contains('show')) {
                    calculateProjection();
                }
            });
        }
    });
    
    // Chargement des données sauvegardées
    loadData();
    
    console.log('Planificateur Retraite initialisé avec succès - 4 onglets actifs !');
});

// Fonctions de sauvegarde et chargement (optionnelles)
function saveData() {
    console.log('Sauvegarde des données...');
    // Vous pouvez implémenter ici la sauvegarde localStorage si besoin
}

function loadData() {
    console.log('Chargement des données...');
    // Vous pouvez implémenter ici le chargement localStorage si besoin
}
