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

// Constantes fiscales 2025
const FISCAL_CONSTANTS = {
    ABATTEMENT_SALAIRE_MIN: 448,
    ABATTEMENT_SALAIRE_MAX: 13000,
    ABATTEMENT_PENSION_MIN: 448,
    ABATTEMENT_PENSION_MAX: 4123,
    ABATTEMENT_MICRO_FONCIER: 0.30,
    ABATTEMENT_MICRO_BNC: 0.34,
    ABATTEMENT_MICRO_BIC_SERVICES: 0.50,
    ABATTEMENT_MICRO_BIC_VENTE: 0.71
};

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

// ==============================================
// FONCTIONS PARTS FISCALES
// ==============================================

function updateTotalParts() {
    const partsEntieres = parseFloat(document.getElementById('partsEntieres').value) || 1;
    const demiParts = parseFloat(document.getElementById('demiParts').value) || 0;
    const totalParts = partsEntieres + demiParts;
    
    document.getElementById('totalPartsDisplay').textContent = totalParts;
    document.getElementById('parts').value = totalParts;
    
    console.log('✅ Parts fiscales mises à jour:', totalParts);
    
    // Mise à jour automatique du couple toggle si nécessaire
    if (partsEntieres === 2 && !isCouple) {
        document.getElementById('coupleToggle').checked = true;
        toggleCouple();
    } else if (partsEntieres === 1 && isCouple) {
        document.getElementById('coupleToggle').checked = false;
        toggleCouple();
    }
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
        
        // Mise à jour automatique des parts fiscales
        const partsEntieresSelect = document.getElementById('partsEntieres');
        if (partsEntieresSelect && partsEntieresSelect.value === '1') {
            partsEntieresSelect.value = '2';
            updateTotalParts();
        }
    } else {
        sections.classList.remove('couple');
        if (sections.children.length === 2) {
            sections.removeChild(sections.lastChild);
        }
        
        // Mise à jour automatique des parts fiscales
        const partsEntieresSelect = document.getElementById('partsEntieres');
        if (partsEntieresSelect && partsEntieresSelect.value === '2') {
            partsEntieresSelect.value = '1';
            updateTotalParts();
        }
    }
    
    // Mise à jour de la zone conjoint en mode détaillé
    toggleConjointInDetailMode();
    
    // Mise à jour du récapitulatif
    setTimeout(() => {
        updateRecapRevenus();
    }, 100);
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
// FONCTIONS MODE DÉTAILLÉ
// ==============================================

function toggleConjointInDetailMode() {
    const conjointZone = document.getElementById('conjoint-revenus-detail');
    
    if (conjointZone) {
        if (isCouple) {
            conjointZone.style.display = 'block';
            console.log('👫 Zone conjoint affichée en mode détaillé');
        } else {
            conjointZone.style.display = 'none';
            console.log('👤 Zone conjoint masquée en mode détaillé');
        }
    }
}

function toggleModeDetaille() {
    const checkbox = document.getElementById('modeDetaille');
    const modeSimpleDiv = document.getElementById('modeSimple');
    const modeDetailleDiv = document.getElementById('modeDetailleSection');
    
    console.log('🔄 Toggle mode détaillé:', checkbox.checked);
    
    if (checkbox.checked) {
        modeSimpleDiv.style.display = 'none';
        modeDetailleDiv.style.display = 'block';
        
        // Afficher la zone conjoint si couple
        toggleConjointInDetailMode();
        
        syncDataToDetailMode();
        console.log('✅ Mode détaillé activé');
    } else {
        modeSimpleDiv.style.display = 'block';
        modeDetailleDiv.style.display = 'none';
        syncDataFromDetailMode();
        console.log('✅ Mode simple activé');
    }
}

function syncDataToDetailMode() {
    console.log('📊 Synchronisation vers mode détaillé (avec conjoint)');
    
    // Client principal
    const revenus1Element = document.getElementById('revenus1');
    const revenusRetraite1Element = document.getElementById('revenusRetraite1');
    
    if (revenus1Element && revenus1Element.value) {
        const revenusNets = parseFloat(revenus1Element.value);
        const salaireBrutEstime = Math.round(revenusNets * 12 * 1.25);
        
        const salaireBrutInput = document.getElementById('salaireBrut1');
        if (salaireBrutInput) {
            salaireBrutInput.value = salaireBrutEstime;
            calculateSalaryDetails(1);
        }
    }
    
    if (revenusRetraite1Element && revenusRetraite1Element.value) {
        const revenusRetraiteNets = parseFloat(revenusRetraite1Element.value);
        const pensionBruteEstimee = Math.round(revenusRetraiteNets * 12 * 1.11);
        
        const pensionBruteInput = document.getElementById('pensionBrute1');
        if (pensionBruteInput) {
            pensionBruteInput.value = pensionBruteEstimee;
            calculatePensionDetails(1);
        }
    }
    
    // Conjoint (si couple)
    if (isCouple) {
        const revenus2Element = document.getElementById('revenus2');
        const revenusRetraite2Element = document.getElementById('revenusRetraite2');
        
        if (revenus2Element && revenus2Element.value) {
            const revenusNets = parseFloat(revenus2Element.value);
            const salaireBrutEstime = Math.round(revenusNets * 12 * 1.25);
            
            const salaireBrutInput = document.getElementById('salaireBrut2');
            if (salaireBrutInput) {
                salaireBrutInput.value = salaireBrutEstime;
                calculateSalaryDetails(2);
            }
        }
        
        if (revenusRetraite2Element && revenusRetraite2Element.value) {
            const revenusRetraiteNets = parseFloat(revenusRetraite2Element.value);
            const pensionBruteEstimee = Math.round(revenusRetraiteNets * 12 * 1.11);
            
            const pensionBruteInput = document.getElementById('pensionBrute2');
            if (pensionBruteInput) {
                pensionBruteInput.value = pensionBruteEstimee;
                calculatePensionDetails(2);
            }
        }
    }
    
    updateRecapRevenus();
}

function syncDataFromDetailMode() {
    console.log('📊 Synchronisation depuis mode détaillé');
    
    const revenuNetFiscalElement = document.getElementById('revenuNetFiscal1');
    const pensionNetFiscaleElement = document.getElementById('pensionNetFiscale1');
    
    if (revenuNetFiscalElement && revenuNetFiscalElement.textContent !== '0 €') {
        const montant = parseInt(revenuNetFiscalElement.textContent.replace(/[^\d]/g, ''));
        const revenusNetsElement = document.getElementById('revenus1');
        if (revenusNetsElement) {
            revenusNetsElement.value = Math.round(montant / 12);
        }
    }
    
    if (pensionNetFiscaleElement && pensionNetFiscaleElement.textContent !== '0 €') {
        const montant = parseInt(pensionNetFiscaleElement.textContent.replace(/[^\d]/g, ''));
        const revenusRetraiteElement = document.getElementById('revenusRetraite1');
        if (revenusRetraiteElement) {
            revenusRetraiteElement.value = Math.round(montant / 12);
        }
    }
    
    // Conjoint
    if (isCouple) {
        const revenuNetFiscal2Element = document.getElementById('revenuNetFiscal2');
        const pensionNetFiscale2Element = document.getElementById('pensionNetFiscale2');
        
        if (revenuNetFiscal2Element && revenuNetFiscal2Element.textContent !== '0 €') {
            const montant = parseInt(revenuNetFiscal2Element.textContent.replace(/[^\d]/g, ''));
            const revenus2Element = document.getElementById('revenus2');
            if (revenus2Element) {
                revenus2Element.value = Math.round(montant / 12);
            }
        }
        
        if (pensionNetFiscale2Element && pensionNetFiscale2Element.textContent !== '0 €') {
            const montant = parseInt(pensionNetFiscale2Element.textContent.replace(/[^\d]/g, ''));
            const revenusRetraite2Element = document.getElementById('revenusRetraite2');
            if (revenusRetraite2Element) {
                revenusRetraite2Element.value = Math.round(montant / 12);
            }
        }
    }
}

function updateRecapRevenus() {
    console.log('📊 Mise à jour récapitulatif revenus');
    
    let totalActuel = 0;
    let totalRetraite = 0;
    
    // Si on est en mode détaillé, utiliser les calculs détaillés
    const modeDetailleCheckbox = document.getElementById('modeDetaille');
    const modeDetaille = modeDetailleCheckbox ? modeDetailleCheckbox.checked : false;
    
    if (modeDetaille) {
        // Utiliser les revenus nets fiscaux calculés
        const revenuFiscal1 = document.getElementById('revenuNetFiscal1');
        const pensionFiscale1 = document.getElementById('pensionNetFiscale1');
        
        if (revenuFiscal1 && revenuFiscal1.textContent !== '0 €') {
            totalActuel += parseInt(revenuFiscal1.textContent.replace(/[^\d]/g, '')) / 12;
        }
        
        if (pensionFiscale1 && pensionFiscale1.textContent !== '0 €') {
            totalRetraite += parseInt(pensionFiscale1.textContent.replace(/[^\d]/g, '')) / 12;
        }
        
        // Conjoint si couple
        if (isCouple) {
            const revenuFiscal2 = document.getElementById('revenuNetFiscal2');
            const pensionFiscale2 = document.getElementById('pensionNetFiscale2');
            
            if (revenuFiscal2 && revenuFiscal2.textContent !== '0 €') {
                totalActuel += parseInt(revenuFiscal2.textContent.replace(/[^\d]/g, '')) / 12;
            }
            
            if (pensionFiscale2 && pensionFiscale2.textContent !== '0 €') {
                totalRetraite += parseInt(pensionFiscale2.textContent.replace(/[^\d]/g, '')) / 12;
            }
        }
        
        // Ajouter BNC/BIC si présents
        const beneficeProElements = document.querySelectorAll('[id^="beneficePro"]');
        beneficeProElements.forEach(element => {
            if (element.textContent !== '0 €') {
                totalActuel += parseInt(element.textContent.replace(/[^\d]/g, '')) / 12;
            }
        });
        
        // Ajouter revenus fonciers si présents
        const totalFoncier = document.getElementById('totalRevenusFonciers');
        if (totalFoncier && totalFoncier.textContent !== '0 €') {
            const foncierAnnuel = parseInt(totalFoncier.textContent.replace(/[^\d]/g, ''));
            totalActuel += foncierAnnuel / 12;
            totalRetraite += foncierAnnuel / 12; // Foncier maintenu à la retraite
        }
        
    } else {
        // Mode simple : utiliser les données de l'onglet 1
        const revenus1 = parseFloat(document.getElementById('revenus1').value) || 0;
        const revenusRetraite1 = parseFloat(document.getElementById('revenusRetraite1').value) || 0;
        
        totalActuel += revenus1;
        totalRetraite += revenusRetraite1;
        
        if (isCouple) {
            const revenus2Element = document.getElementById('revenus2');
            const revenusRetraite2Element = document.getElementById('revenusRetraite2');
            
            if (revenus2Element) totalActuel += parseFloat(revenus2Element.value) || 0;
            if (revenusRetraite2Element) totalRetraite += parseFloat(revenusRetraite2Element.value) || 0;
        }
    }
    
    // Affichage
    const recapActuelElement = document.getElementById('revenusNetsRecap');
    const recapRetraiteElement = document.getElementById('revenusRetraiteRecap');
    
    if (recapActuelElement) {
        recapActuelElement.value = `${Math.round(totalActuel).toLocaleString()} € / mois`;
    }
    
    if (recapRetraiteElement) {
        recapRetraiteElement.value = `${Math.round(totalRetraite).toLocaleString()} € / mois`;
    }
    
    console.log('✅ Récapitulatif mis à jour:', {
        totalActuel: Math.round(totalActuel),
        totalRetraite: Math.round(totalRetraite),
        modeDetaille: modeDetaille
    });
}

// ==============================================
// CALCULS DÉTAILLÉS
// ==============================================

function calculateSalaryDetails(clientNumber) {
    console.log(`🧮 Calcul salaire client ${clientNumber}`);
    
    const salaireBrutElement = document.getElementById(`salaireBrut${clientNumber}`);
    const deductionTypeElement = document.getElementById(`deductionType${clientNumber}`);
    
    if (!salaireBrutElement || !deductionTypeElement) {
        console.log('❌ Éléments manquants pour le calcul');
        return;
    }
    
    const salaireBrut = parseFloat(salaireBrutElement.value) || 0;
    const deductionType = deductionTypeElement.value;
    
    let revenuNetFiscal = 0;
    
    if (deductionType === 'abattement') {
        const abattement = Math.min(salaireBrut * 0.10, FISCAL_CONSTANTS.ABATTEMENT_SALAIRE_MAX);
        const abattementFinal = Math.max(abattement, FISCAL_CONSTANTS.ABATTEMENT_SALAIRE_MIN);
        revenuNetFiscal = salaireBrut - abattementFinal;
        
        console.log(`💰 Abattement appliqué: ${abattementFinal} €`);
    } else {
        // Frais réels
        const fraisZone = document.getElementById(`fraisReels${clientNumber}`);
        if (fraisZone) {
            const fraisInputs = fraisZone.querySelectorAll('input[type="number"]');
            let totalFrais = 0;
            
            fraisInputs.forEach(input => {
                totalFrais += parseFloat(input.value) || 0;
            });
            
            revenuNetFiscal = salaireBrut - totalFrais;
            console.log(`💰 Frais réels appliqués: ${totalFrais} €`);
        }
    }
    
    const resultElement = document.getElementById(`revenuNetFiscal${clientNumber}`);
    if (resultElement) {
        resultElement.textContent = `${Math.round(revenuNetFiscal).toLocaleString()} €`;
        console.log(`✅ Revenu net fiscal: ${Math.round(revenuNetFiscal)} €`);
    }
    
    // Mise à jour du récapitulatif
    updateRecapRevenus();
}

function calculatePensionDetails(clientNumber) {
    console.log(`🧮 Calcul pension client ${clientNumber}`);
    
    const pensionBruteElement = document.getElementById(`pensionBrute${clientNumber}`);
    const abattementElement = document.getElementById(`abattementPension${clientNumber}`);
    
    if (!pensionBruteElement || !abattementElement) {
        console.log('❌ Éléments manquants pour le calcul pension');
        return;
    }
    
    const pensionBrute = parseFloat(pensionBruteElement.value) || 0;
    const abattementTaux = parseFloat(abattementElement.value) || 0;
    
    let pensionNetFiscale = 0;
    
    if (abattementTaux > 0) {
        const abattement = Math.min(pensionBrute * (abattementTaux / 100), FISCAL_CONSTANTS.ABATTEMENT_PENSION_MAX);
        const abattementFinal = Math.max(abattement, FISCAL_CONSTANTS.ABATTEMENT_PENSION_MIN);
        pensionNetFiscale = pensionBrute - abattementFinal;
        
        console.log(`🏖️ Abattement pension appliqué: ${abattementFinal} €`);
    } else {
        pensionNetFiscale = pensionBrute;
    }
    
    const resultElement = document.getElementById(`pensionNetFiscale${clientNumber}`);
    if (resultElement) {
        resultElement.textContent = `${Math.round(pensionNetFiscale).toLocaleString()} €`;
        console.log(`✅ Pension nette fiscale: ${Math.round(pensionNetFiscale)} €`);
    }
    
    // Mise à jour du récapitulatif
    updateRecapRevenus();
}

function updateDeductionType(clientNumber) {
    const deductionType = document.getElementById(`deductionType${clientNumber}`).value;
    const fraisReelsZone = document.getElementById(`fraisReels${clientNumber}`);
    
    if (fraisReelsZone) {
        if (deductionType === 'frais-reels') {
            fraisReelsZone.style.display = 'block';
        } else {
            fraisReelsZone.style.display = 'none';
        }
    }
    
    calculateSalaryDetails(clientNumber);
}

function updateStatutPro(clientNumber) {
    // Fonction pour gérer les changements de statut professionnel
    // Peut être étendue pour adapter l'interface selon le statut
    console.log(`Statut professionnel client ${clientNumber} mis à jour`);
}

// ==============================================
// FONCTIONS REVENUS PROFESSIONNELS
// ==============================================

function toggleRevenusPro() {
    const hasRevenusPro = document.getElementById('hasRevenusPro').checked;
    const revenusProDetail = document.getElementById('revenusProDetail');
    
    console.log('🔄 Toggle revenus professionnels:', hasRevenusPro);
    
    if (hasRevenusPro) {
        revenusProDetail.style.display = 'block';
        
        // Ajouter la structure si elle n'existe pas
        if (revenusProDetail.children.length === 0) {
            revenusProDetail.innerHTML = `
                <div class="revenus-pro-item">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Type d'activité</label>
                            <select id="typeActivite1" onchange="updateTypeActivite(1)">
                                <option value="BNC">BNC - Profession libérale</option>
                                <option value="BIC">BIC - Commerce/Artisanat</option>
                                <option value="BA">BA - Activité agricole</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <input type="text" placeholder="Ex: Consultant, médecin...">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Chiffre d'affaires annuel</label>
                            <input type="number" id="ca1" placeholder="80000" class="euro" onchange="calculateRevenusPro(1)">
                        </div>
                        <div class="form-group">
                            <label>Régime fiscal</label>
                            <select id="regimePro1" onchange="updateRegimePro(1)">
                                <option value="micro-bnc">Micro-BNC (abattement 34%)</option>
                                <option value="reel">Régime réel (charges déductibles)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="chargesPro1" class="charges-pro-zone" style="display: none;">
                        <h6>📝 Charges Professionnelles</h6>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Charges déductibles annuelles</label>
                                <input type="number" placeholder="25000" class="euro" onchange="calculateRevenusPro(1)">
                            </div>
                        </div>
                    </div>
                    
                    <div class="calcul-result">
                        <strong>Bénéfice imposable : <span id="beneficePro1">0 €</span></strong>
                    </div>
                    
                    <button onclick="removeRevenusPro(this)" class="remove-btn" style="margin-top: 15px;">🗑️ Supprimer cette activité</button>
                </div>
                
                <button class="add-contract-btn" onclick="addRevenusPro()">➕ Ajouter une activité</button>
            `;
            
            updateTypeActivite(1);
        }
    } else {
        revenusProDetail.style.display = 'none';
    }
}

function updateTypeActivite(index) {
    const typeActivite = document.getElementById(`typeActivite${index}`).value;
    const regimeSelect = document.getElementById(`regimePro${index}`);
    
    let options = '';
    
    switch(typeActivite) {
        case 'BNC':
            options = `
                <option value="micro-bnc">Micro-BNC (abattement 34%)</option>
                <option value="reel">Régime réel (charges déductibles)</option>
            `;
            break;
        case 'BIC':
            options = `
                <option value="micro-bic-service">Micro-BIC Services (abattement 50%)</option>
                <option value="micro-bic-vente">Micro-BIC Vente (abattement 71%)</option>
                <option value="reel">Régime réel (charges déductibles)</option>
            `;
            break;
        case 'BA':
            options = `
                <option value="micro-ba">Micro-BA (abattement 87%)</option>
                <option value="reel">Régime réel (charges déductibles)</option>
            `;
            break;
    }
    
    regimeSelect.innerHTML = options;
    updateRegimePro(index);
}

function updateRegimePro(index) {
    const regime = document.getElementById(`regimePro${index}`).value;
    const chargesZone = document.getElementById(`chargesPro${index}`);
    
    if (regime === 'reel') {
        chargesZone.style.display = 'block';
    } else {
        chargesZone.style.display = 'none';
    }
    
    calculateRevenusPro(index);
}

function calculateRevenusPro(index) {
    const ca = parseFloat(document.getElementById(`ca${index}`).value) || 0;
    const regime = document.getElementById(`regimePro${index}`).value;
    
    let benefice = 0;
    
    if (regime === 'reel') {
        const chargesInput = document.querySelector(`#chargesPro${index} input[type="number"]`);
        const charges = chargesInput ? parseFloat(chargesInput.value) || 0 : 0;
        benefice = ca - charges;
    } else {
        // Régimes micro
        let abattement = 0;
        
        switch(regime) {
            case 'micro-bnc':
                abattement = FISCAL_CONSTANTS.ABATTEMENT_MICRO_BNC;
                break;
            case 'micro-bic-service':
                abattement = FISCAL_CONSTANTS.ABATTEMENT_MICRO_BIC_SERVICES;
                break;
            case 'micro-bic-vente':
                abattement = FISCAL_CONSTANTS.ABATTEMENT_MICRO_BIC_VENTE;
                break;
            case 'micro-ba':
                abattement = 0.87; // 87% pour BA
                break;
        }
        
        benefice = ca * (1 - abattement);
    }
    
    const resultElement = document.getElementById(`beneficePro${index}`);
    if (resultElement) {
        resultElement.textContent = `${Math.round(benefice).toLocaleString()} €`;
    }
    
    console.log(`💼 Bénéfice professionnel calculé: ${Math.round(benefice)} €`);
    
    // Mise à jour du récapitulatif
    updateRecapRevenus();
}

function addRevenusPro() {
    const revenusProDetail = document.getElementById('revenusProDetail');
    const existingItems = revenusProDetail.querySelectorAll('.revenus-pro-item');
    const newIndex = existingItems.length + 1;
    
    const addButton = revenusProDetail.querySelector('.add-contract-btn');
    
    const newItem = document.createElement('div');
    newItem.className = 'revenus-pro-item';
    newItem.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Type d'activité</label>
                <select id="typeActivite${newIndex}" onchange="updateTypeActivite(${newIndex})">
                    <option value="BNC">BNC - Profession libérale</option>
                    <option value="BIC">BIC - Commerce/Artisanat</option>
                    <option value="BA">BA - Activité agricole</option>
                </select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" placeholder="Ex: Consultant, médecin...">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Chiffre d'affaires annuel</label>
                <input type="number" id="ca${newIndex}" placeholder="80000" class="euro" onchange="calculateRevenusPro(${newIndex})">
            </div>
            <div class="form-group">
                <label>Régime fiscal</label>
                <select id="regimePro${newIndex}" onchange="updateRegimePro(${newIndex})">
                    <option value="micro-bnc">Micro-BNC (abattement 34%)</option>
                    <option value="reel">Régime réel (charges déductibles)</option>
                </select>
            </div>
        </div>
        
        <div id="chargesPro${newIndex}" class="charges-pro-zone" style="display: none;">
            <h6>📝 Charges Professionnelles</h6>
            <div class="form-row">
                <div class="form-group">
                    <label>Charges déductibles annuelles</label>
                    <input type="number" placeholder="25000" class="euro" onchange="calculateRevenusPro(${newIndex})">
                </div>
            </div>
        </div>
        
        <div class="calcul-result">
            <strong>Bénéfice imposable : <span id="beneficePro${newIndex}">0 €</span></strong>
        </div>
        
        <button onclick="removeRevenusPro(this)" class="remove-btn" style="margin-top: 15px;">🗑️ Supprimer cette activité</button>
    `;
    
    revenusProDetail.insertBefore(newItem, addButton);
    updateTypeActivite(newIndex);
}

function removeRevenusPro(button) {
    const item = button.closest('.revenus-pro-item');
    item.remove();
    updateRecapRevenus();
}

// ==============================================
// FONCTIONS REVENUS FONCIERS
// ==============================================

function toggleRevenusFoncier() {
    const hasRevenusFoncier = document.getElementById('hasRevenusFoncier').checked;
    const revenusFoncierDetail = document.getElementById('revenusFoncierDetail');
    
    console.log('🔄 Toggle revenus fonciers:', hasRevenusFoncier);
    
    if (hasRevenusFoncier) {
        revenusFoncierDetail.style.display = 'block';
        
        // Ajouter la structure si elle n'existe pas
        if (revenusFoncierDetail.children.length === 0) {
            revenusFoncierDetail.innerHTML = `
                <div id="biensFonciersList">
                    <div class="bien-foncier-item">
                        <div class="bien-header">
                            <h6>🏘️ Bien n°1</h6>
                            <button onclick="removeBienFoncier(this)" class="remove-btn" style="display: none;">🗑️</button>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Type de bien</label>
                                <select>
                                    <option>Appartement</option>
                                    <option>Maison</option>
                                    <option>Local commercial</option>
                                    <option>Garage/Box</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Ville</label>
                                <input type="text" placeholder="Paris, Lyon...">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Type de location</label>
                                <select onchange="updateTypeLocation(this)">
                                    <option value="nue">Location nue</option>
                                    <option value="meublee">Location meublée</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Régime fiscal</label>
                                <select class="regime-foncier" onchange="updateRegimeFoncier(this)">
                                    <option value="micro">Micro-foncier (abattement 30%)</option>
                                    <option value="reel">Régime réel</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Loyers annuels bruts</label>
                                <input type="number" placeholder="9600" class="euro loyers-foncier" onchange="calculateFoncier(this)">
                            </div>
                            <div class="form-group charges-foncier-zone" style="display: none;">
                                <label>Charges déductibles annuelles</label>
                                <input type="number" placeholder="2400" class="euro charges-foncier" onchange="calculateFoncier(this)">
                            </div>
                        </div>
                        
                        <div class="calcul-result">
                            <strong>Revenu foncier net : <span class="revenu-foncier-result">0 €</span></strong>
                        </div>
                    </div>
                </div>
                
                <button class="add-contract-btn" onclick="addBienFoncier()">➕ Ajouter un bien</button>
                
                <div class="foncier-total">
                    <h6>📊 Total Revenus Fonciers</h6>
                    <p><strong>Total : <span id="totalRevenusFonciers">0 €</span></strong></p>
                </div>
            `;
        }
    } else {
        revenusFoncierDetail.style.display = 'none';
    }
}

function updateTypeLocation(selectElement) {
    const bien = selectElement.closest('.bien-foncier-item');
    const regimeSelect = bien.querySelector('.regime-foncier');
    const typeLocation = selectElement.value;
    
    if (typeLocation === 'meublee') {
        regimeSelect.innerHTML = `
            <option value="micro">Micro-BIC (abattement 50%)</option>
            <option value="reel">Régime réel</option>
        `;
    } else {
        regimeSelect.innerHTML = `
            <option value="micro">Micro-foncier (abattement 30%)</option>
            <option value="reel">Régime réel</option>
        `;
    }
    
    calculateFoncier(selectElement);
}

function updateRegimeFoncier(selectElement) {
    const bien = selectElement.closest('.bien-foncier-item');
    const chargesZone = bien.querySelector('.charges-foncier-zone');
    const regime = selectElement.value;
    
    if (regime === 'reel') {
        chargesZone.style.display = 'block';
    } else {
        chargesZone.style.display = 'none';
    }
    
    calculateFoncier(selectElement);
}

function calculateFoncier(element) {
    const bien = element.closest('.bien-foncier-item');
    const loyersInput = bien.querySelector('.loyers-foncier');
    const chargesInput = bien.querySelector('.charges-foncier');
    const regimeSelect = bien.querySelector('.regime-foncier');
    const typeLocationSelect = bien.querySelector('select[onchange*="updateTypeLocation"]');
    
    const loyers = parseFloat(loyersInput.value) || 0;
    const charges = parseFloat(chargesInput.value) || 0;
    const regime = regimeSelect.value;
    const typeLocation = typeLocationSelect.value;
    
    let revenuNet = 0;
    
    if (regime === 'micro') {
        const abattement = typeLocation === 'meublee' ? FISCAL_CONSTANTS.ABATTEMENT_MICRO_BIC_SERVICES : FISCAL_CONSTANTS.ABATTEMENT_MICRO_FONCIER;
        revenuNet = loyers * (1 - abattement);
    } else {
        revenuNet = loyers - charges;
    }
    
    const resultElement = bien.querySelector('.revenu-foncier-result');
    if (resultElement) {
        resultElement.textContent = `${Math.round(revenuNet).toLocaleString()} €`;
    }
    
    updateTotalFoncier();
}

function updateTotalFoncier() {
    const resultElements = document.querySelectorAll('.revenu-foncier-result');
    let total = 0;
    
    resultElements.forEach(element => {
        const value = parseFloat(element.textContent.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
        total += value;
    });
    
    const totalElement = document.getElementById('totalRevenusFonciers');
    if (totalElement) {
        totalElement.textContent = `${Math.round(total).toLocaleString()} €`;
    }
    
    // Mise à jour du récapitulatif
    updateRecapRevenus();
}

function addBienFoncier() {
    const biensList = document.getElementById('biensFonciersList');
    const bienCount = biensList.children.length + 1;
    
    const newBien = document.createElement('div');
    newBien.className = 'bien-foncier-item';
    newBien.innerHTML = `
        <div class="bien-header">
            <h6>🏘️ Bien n°${bienCount}</h6>
            <button onclick="removeBienFoncier(this)" class="remove-btn">🗑️</button>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Type de bien</label>
                <select>
                    <option>Appartement</option>
                    <option>Maison</option>
                    <option>Local commercial</option>
                    <option>Garage/Box</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ville</label>
                <input type="text" placeholder="Paris, Lyon...">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Type de location</label>
                <select onchange="updateTypeLocation(this)">
                    <option value="nue">Location nue</option>
                    <option value="meublee">Location meublée</option>
                </select>
            </div>
            <div class="form-group">
                <label>Régime fiscal</label>
                <select class="regime-foncier" onchange="updateRegimeFoncier(this)">
                    <option value="micro">Micro-foncier (abattement 30%)</option>
                    <option value="reel">Régime réel</option>
                </select>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Loyers annuels bruts</label>
                <input type="number" placeholder="9600" class="euro loyers-foncier" onchange="calculateFoncier(this)">
            </div>
            <div class="form-group charges-foncier-zone" style="display: none;">
                <label>Charges déductibles annuelles</label>
                <input type="number" placeholder="2400" class="euro charges-foncier" onchange="calculateFoncier(this)">
            </div>
        </div>
        
        <div class="calcul-result">
            <strong>Revenu foncier net : <span class="revenu-foncier-result">0 €</span></strong>
        </div>
    `;
    
    biensList.appendChild(newBien);
    
    // Afficher le bouton supprimer du premier bien s'il y en a plus d'un
    const firstBien = biensList.querySelector('.bien-foncier-item .remove-btn');
    if (firstBien) {
        firstBien.style.display = 'inline-block';
    }
}

function removeBienFoncier(button) {
    const bien = button.closest('.bien-foncier-item');
    const biensList = document.getElementById('biensFonciersList');
    
    bien.remove();
    
    // Renuméroter les biens
    const biens = biensList.querySelectorAll('.bien-foncier-item');
    biens.forEach((bien, index) => {
        const header = bien.querySelector('.bien-header h6');
        header.textContent = `🏘️ Bien n°${index + 1}`;
        
        // Masquer le bouton supprimer s'il ne reste qu'un bien
        const removeBtn = bien.querySelector('.remove-btn');
        if (biens.length === 1) {
            removeBtn.style.display = 'none';
        }
    });
    
    updateTotalFoncier();
}

// ==============================================
// CALCUL DU BUDGET AVEC DONNÉES DÉTAILLÉES
// ==============================================

function calculateBudgetWithDetails() {
    console.log('🔍 Calcul du budget avec données détaillées');
    
    try {
        const modeDetailleCheckbox = document.getElementById('modeDetaille');
        const modeDetaille = modeDetailleCheckbox ? modeDetailleCheckbox.checked : false;
        
        let revenusActuels = 0;
        let revenusRetraite = 0;
        
        if (modeDetaille) {
            // Utiliser les calculs détaillés
            console.log('📊 Mode détaillé activé - utilisation des calculs précis');
            
            // Revenus salariaux client principal
            const revenuFiscal1 = document.getElementById('revenuNetFiscal1');
            if (revenuFiscal1 && revenuFiscal1.textContent !== '0 €') {
                revenusActuels += parseInt(revenuFiscal1.textContent.replace(/[^\d]/g, ''));
            }
            
            // Pensions client principal
            const pensionFiscale1 = document.getElementById('pensionNetFiscale1');
            if (pensionFiscale1 && pensionFiscale1.textContent !== '0 €') {
                revenusRetraite += parseInt(pensionFiscale1.textContent.replace(/[^\d]/g, ''));
            }
            
            // Conjoint si couple
            if (isCouple) {
                const revenuFiscal2 = document.getElementById('revenuNetFiscal2');
                const pensionFiscale2 = document.getElementById('pensionNetFiscale2');
                
                if (revenuFiscal2 && revenuFiscal2.textContent !== '0 €') {
                    revenusActuels += parseInt(revenuFiscal2.textContent.replace(/[^\d]/g, ''));
                }
                
                if (pensionFiscale2 && pensionFiscale2.textContent !== '0 €') {
                    revenusRetraite += parseInt(pensionFiscale2.textContent.replace(/[^\d]/g, ''));
                }
            }
            
            // Revenus professionnels BNC/BIC
            const beneficeProElements = document.querySelectorAll('[id^="beneficePro"]');
            beneficeProElements.forEach(element => {
                if (element.textContent !== '0 €') {
                    revenusActuels += parseInt(element.textContent.replace(/[^\d]/g, ''));
                }
            });
            
            // Revenus fonciers
            const totalFoncier = document.getElementById('totalRevenusFonciers');
            if (totalFoncier && totalFoncier.textContent !== '0 €') {
                const foncierAnnuel = parseInt(totalFoncier.textContent.replace(/[^\d]/g, ''));
                revenusActuels += foncierAnnuel;
                revenusRetraite += foncierAnnuel; // Maintenu à la retraite
            }
            
        } else {
            // Mode simplifié - utiliser les données de l'onglet 1
            console.log('📊 Mode simplifié - utilisation des données de l\'onglet 1');
            
            const revenus1 = (parseFloat(document.getElementById('revenus1').value) || 0) * 12;
            const revenusRetraite1 = (parseFloat(document.getElementById('revenusRetraite1').value) || 0) * 12;
            
            revenusActuels += revenus1;
            revenusRetraite += revenusRetraite1;
            
            if (isCouple) {
                const revenus2Element = document.getElementById('revenus2');
                const revenusRetraite2Element = document.getElementById('revenusRetraite2');
                
                if (revenus2Element) {
                    revenusActuels += (parseFloat(revenus2Element.value) || 0) * 12;
                }
                if (revenusRetraite2Element) {
                    revenusRetraite += (parseFloat(revenusRetraite2Element.value) || 0) * 12;
                }
            }
        }
        
        // Ajouter autres revenus
        const revenusAutres = (parseFloat(document.getElementById('revenusAutres').value) || 0) * 12;
        revenusActuels += revenusAutres;
        revenusRetraite += revenusAutres;
        
        // Calcul des charges
        const trainVie = parseFloat(document.getElementById('trainVie').value) || 0;
        let totalCredits = 0;
        const creditInputs = document.querySelectorAll('#creditsList .contract-item input[type="number"]');
        creditInputs.forEach(input => {
            totalCredits += parseFloat(input.value) || 0;
        });
        
        // Calcul des impôts
        const nbParts = parseFloat(document.getElementById('parts').value) || 1;
        const impotActuel = calculerImpotRevenu(revenusActuels, nbParts);
        const impotRetraite = calculerImpotRevenu(revenusRetraite, nbParts);
        
        // Revenus nets après impôts (mensuel)
        const revenusNetsActuels = (revenusActuels - impotActuel) / 12;
        const revenusNetsRetraite = (revenusRetraite - impotRetraite) / 12;
        
        const chargesTotal = trainVie + totalCredits;
        const deficitMensuel = chargesTotal - revenusNetsRetraite;
        const deficitAnnuel = deficitMensuel * 12;
        
        // Affichage des résultats
        let resultText = `
            <div style="margin-bottom: 25px;">
                <h5 style="color: #2c3e50; margin-bottom: 15px;">📊 Situation Financière ${modeDetaille ? 'Détaillée' : 'Simplifiée'}</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                        <strong>Revenus actuels (bruts)</strong><br>
                        <span style="font-size: 1.2em; color: #1976d2;">${(revenusActuels/12).toLocaleString()} €/mois</span>
                    </div>
                    <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                        <strong>Revenus retraite (bruts)</strong><br>
                        <span style="font-size: 1.2em; color: #7b1fa2;">${(revenusRetraite/12).toLocaleString()} €/mois</span>
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
                        <p style="margin: 5px 0;"><strong>Revenus annuels :</strong> ${revenusActuels.toLocaleString()} €</p>
                        <p style="margin: 5px 0;"><strong>Impôt annuel :</strong> <span style="color: #dc3545;">${impotActuel.toLocaleString()} €</span></p>
                        <p style="margin: 5px 0;"><strong>Impôt mensuel :</strong> <span style="color: #dc3545;">${Math.round(impotActuel / 12).toLocaleString()} €</span></p>
                        <p style="margin: 5px 0;"><strong>Revenus nets/mois :</strong> <span style="color: #28a745;">${Math.round(revenusNetsActuels).toLocaleString()} €</span></p>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h6 style="color: #2c3e50; margin-bottom: 10px;">🏖️ À la Retraite</h6>
                        <p style="margin: 5px 0;"><strong>Revenus annuels :</strong> ${revenusRetraite.toLocaleString()} €</p>
                        <p style="margin: 5px 0;"><strong>Impôt annuel :</strong> <span style="color: #dc3545;">${impotRetraite.toLocaleString()} €</span></p>
                        <p style="margin: 5px 0;"><strong>Impôt mensuel :</strong> <span style="color: #dc3545;">${Math.round(impotRetraite / 12).toLocaleString()} €</span></p>
                        <p style="margin: 5px 0;"><strong>Revenus nets/mois :</strong> <span style="color: #28a745;">${Math.round(revenusNetsRetraite).toLocaleString()} €</span></p>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
                    <p style="margin: 0; font-size: 0.9em; color: #495057;"><strong>📝 Note :</strong> Calcul basé sur le barème IR 2025, quotient familial avec ${nbParts} parts.</p>
                </div>
            </div>
        `;
        
        // Analyse du déficit
        if (deficitMensuel > 0) {
            const economieImpot = (impotActuel - impotRetraite) / 12;
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
                    <p style="margin: 0;"><strong>💡 Recommandation :</strong> Il faudra prévoir ${deficitMensuel.toLocaleString()} € de revenus complémentaires par mois pour maintenir votre train de vie à la retraite.</p>
                </div>
            `;
        } else {
            const economieImpot = (impotActuel - impotRetraite) / 12;
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
                    <p style="margin: 0;"><strong>🎉 Félicitations !</strong> Votre situation financière sera équilibrée à la retraite.</p>
                </div>
            `;
        }

        document.getElementById('deficitText').innerHTML = resultText;
        document.getElementById('budgetResult').classList.add('show');
        
        console.log('✅ Calcul du budget terminé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur dans calculateBudgetWithDetails:', error);
        document.getElementById('deficitText').innerHTML = `<p style="color: red;">Erreur lors du calcul : ${error.message}</p>`;
        document.getElementById('budgetResult').classList.add('show');
    }
}

// ==============================================
// GESTION DES CRÉDITS ET CONTRATS (ONGLET 3)
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
// INITIALISATION ET EVENT LISTENERS
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation du planificateur retraite');
    
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
    
    // Event listeners pour les champs de l'onglet 1
    const revenus1 = document.getElementById('revenus1');
    const revenusRetraite1 = document.getElementById('revenusRetraite1');
    
    if (revenus1) {
        revenus1.addEventListener('input', updateRecapRevenus);
    }
    
    if (revenusRetraite1) {
        revenusRetraite1.addEventListener('input', updateRecapRevenus);
    }
    
    // Initialisation de la zone conjoint selon l'état du couple toggle
    setTimeout(() => {
        toggleConjointInDetailMode();
        updateRecapRevenus();
        updateTotalParts();
    }, 500);
    
    // Chargement des données sauvegardées
    loadData();
    
    console.log('✅ Planificateur Retraite initialisé avec succès - Mode détaillé activé !');
});

// Fonctions de sauvegarde et chargement (optionnelles)
function saveData() {
    console.log('💾 Sauvegarde des données...');
    // Vous pouvez implémenter ici la sauvegarde localStorage si besoin
}

function loadData() {
    console.log('📂 Chargement des données...');
    // Vous pouvez implémenter ici le chargement localStorage si besoin
}
