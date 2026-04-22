@echo off
REM ================================================================
REM  LE CHEMIN DU SPP - Script v3 sans accents (source ET cible)
REM ================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  LE CHEMIN DU SPP - Generation de l'arborescence docs
echo ============================================================
echo.

cd /d "%~dp0"

if not exist "Bibliotheque" (
    echo [ERREUR] Dossier Bibliotheque introuvable.
    echo Renomme ton dossier en Bibliotheque sans accent.
    pause
    exit /b 1
)

echo [1/5] Creation de l'arborescence docs...
mkdir "docs" 2>nul
mkdir "docs\doctrines" 2>nul
mkdir "docs\doctrines\gdo" 2>nul
mkdir "docs\doctrines\gto" 2>nul
mkdir "docs\doctrines\ssuap" 2>nul
mkdir "docs\culture-admin" 2>nul
mkdir "docs\culture-admin\organisation-sis" 2>nul
mkdir "docs\culture-admin\organisation-sis\sources" 2>nul
mkdir "docs\culture-admin\fonction-publique" 2>nul
mkdir "docs\culture-admin\statut-spp" 2>nul
mkdir "docs\culture-admin\statut-spp\sources" 2>nul
mkdir "docs\divers" 2>nul
mkdir "docs\concours" 2>nul
echo     OK

echo.
echo [2/5] Copie des GDO...
set "SRC_GDO=Bibliotheque\1) Doctrines Opérationnelles\Guide de Doctrine Opérationnelles"
set "DST_GDO=docs\doctrines\gdo"

copy "%SRC_GDO%\gdo-feu-foret-espace-naturel.pdf"                   "%DST_GDO%\feu-foret-espace-naturel.pdf"         >nul
copy "%SRC_GDO%\gdo-interventions-incendies-structures.pdf"         "%DST_GDO%\incendies-structures.pdf"             >nul
copy "%SRC_GDO%\gdo-interventions-milieu-agricole.pdf"              "%DST_GDO%\milieu-agricole.pdf"                  >nul
copy "%SRC_GDO%\gdo-interventions-presence-gaz .pdf"                "%DST_GDO%\presence-gaz.pdf"                     >nul
copy "%SRC_GDO%\gdo-interventions-silos.pdf"                        "%DST_GDO%\silos.pdf"                            >nul
copy "%SRC_GDO%\gdo-interventions-ulm.pdf"                          "%DST_GDO%\ulm.pdf"                              >nul
copy "%SRC_GDO%\gdo-operations-secours-milieu-routier.pdf"          "%DST_GDO%\milieu-routier.pdf"                   >nul
copy "%SRC_GDO%\gdo-operations-secours-presence-electricite.pdf"    "%DST_GDO%\presence-electricite.pdf"             >nul
copy "%SRC_GDO%\gdo-prevention-risques-toxicite-fumees.pdf"         "%DST_GDO%\toxicite-fumees.pdf"                  >nul
copy "%SRC_GDO%\gdo-secours-soins-urgences-personnes.pdf"           "%DST_GDO%\secours-soins-urgences-personnes.pdf" >nul
echo     GDO : termine.

echo.
echo [3/5] Copie des GTO...
set "SRC_GTO=Bibliotheque\1) Doctrines Opérationnelles\Guide de Techniques Opérationnelles"
set "DST_GTO=docs\doctrines\gto"

copy "%SRC_GTO%\gto-engagement-milieux-vicies.pdf"                  "%DST_GTO%\engagement-milieux-vicies.pdf"        >nul
copy "%SRC_GTO%\gto-Etablissement-techniques-extinction.pdf"        "%DST_GTO%\techniques-extinction.pdf"            >nul
copy "%SRC_GTO%\gto-lutte-feux-forets-espaces-naturels.pdf"         "%DST_GTO%\feux-forets-espaces-naturels.pdf"     >nul
copy "%SRC_GTO%\gto-sauvegarde-operationnelle .pdf"                 "%DST_GTO%\sauvegarde-operationnelle.pdf"        >nul
copy "%SRC_GTO%\gto-sauvetage-mises-securite.pdf"                   "%DST_GTO%\sauvetage-mises-securite.pdf"         >nul
copy "%SRC_GTO%\gto-ventilation-operationnelle.pdf"                 "%DST_GTO%\ventilation-operationnelle.pdf"       >nul
echo     GTO : termine.

set "SRC_SSUAP=Bibliotheque\1) Doctrines Opérationnelles\Secours & Soins Urgence Aux Personnes"
set "DST_SSUAP=docs\doctrines\ssuap"
copy "%SRC_SSUAP%\recommandations-premiers-secours.pdf"             "%DST_SSUAP%\recommandations-premiers-secours.pdf" >nul
echo     SSUAP : termine.

echo.
echo [4/5] Copie de la Culture Administrative...

set "SRC_SIS=Bibliotheque\2) Culture Administratives\Organisation Service Incendie et de Secours"
set "DST_SIS=docs\culture-admin\organisation-sis"

copy "%SRC_SIS%\Organisation et fonctionnement SDIS.pdf"            "%DST_SIS%\fiche-synthese.pdf"                  >nul
copy "%SRC_SIS%\Sources\Article L1424-2 - Code général des collectivités territoriales - Légifrance.pdf"   "%DST_SIS%\sources\cgct-article-l1424-2.pdf"  >nul
copy "%SRC_SIS%\Sources\CHAPITRE IV _ Services d_incendie et de secours.pdf"                                "%DST_SIS%\sources\cgct-chapitre-iv.pdf"      >nul
copy "%SRC_SIS%\Sources\Décret n°97-1225 du 26 décembre 1997 relatif à l_organisation des SDIS.pdf"         "%DST_SIS%\sources\decret-97-1225.pdf"        >nul
copy "%SRC_SIS%\Sources\LOI n° 96-369 du 3 mai 1996 relative aux services d_incendie et de secours.pdf"     "%DST_SIS%\sources\loi-96-369.pdf"            >nul
copy "%SRC_SIS%\Sources\Loi n° 2004-811 du 13 août 2004 de modernisation de la sécurité civile.pdf"         "%DST_SIS%\sources\loi-2004-811.pdf"          >nul
copy "%SRC_SIS%\Sources\LOI n° 2021-1520 du 25 novembre 2021 visant à consolider notre modèle de sécurité civile.pdf"  "%DST_SIS%\sources\loi-2021-1520-matras.pdf"  >nul
echo     Organisation SIS : termine.

set "SRC_FP=Bibliotheque\2) Culture Administratives\La Fonction Publique"
set "DST_FP=docs\culture-admin\fonction-publique"

copy "%SRC_FP%\3 Versants de la Fonction Publique.pdf"              "%DST_FP%\fiche-synthese.pdf"                   >nul
copy "%SRC_FP%\Organisation des pouvoirs publics.pdf"               "%DST_FP%\organisation-pouvoirs-publics.pdf"    >nul
echo     Fonction Publique : termine.

set "SRC_SPP=Bibliotheque\2) Culture Administratives\Le Statut du Sapeur-Pompier Professionnel"
set "DST_SPP=docs\culture-admin\statut-spp"

copy "%SRC_SPP%\Le Statut du Sapeur-Pompier Professionnel.pdf"                                              "%DST_SPP%\fiche-synthese.pdf"                  >nul
copy "%SRC_SPP%\Sources\code-generale-collectivites-territoriales.pdf"                                      "%DST_SPP%\sources\cgct-extrait.pdf"            >nul
copy "%SRC_SPP%\Sources\Décret-89-677-18-septembre-1989-procédure-disciplinaire.pdf"                        "%DST_SPP%\sources\decret-89-677-procedure-disciplinaire.pdf"   >nul
copy "%SRC_SPP%\Sources\Décret-90-850-25-septembre-1990-dispositions-communes-SPP.pdf"                      "%DST_SPP%\sources\decret-90-850-dispositions-communes-spp.pdf" >nul
copy "%SRC_SPP%\Sources\décret-2016-596-12-mai-2016-organisation-carrieres-categorie-c.pdf"                 "%DST_SPP%\sources\decret-2016-596-carrieres-c.pdf"             >nul
copy "%SRC_SPP%\Sources\décret-2023-543-30-juin-2023-modifiant-diverses-dispositions.pdf"                   "%DST_SPP%\sources\decret-2023-543.pdf"         >nul
copy "%SRC_SPP%\Sources\Décret-2024-1038-6-novembre-2024-dispositions-statutaires.pdf"                      "%DST_SPP%\sources\decret-2024-1038.pdf"        >nul
copy "%SRC_SPP%\Sources\décret-2025-330-10-avril-2025-médecine-prevention.pdf"                              "%DST_SPP%\sources\decret-2025-330-medecine-prevention.pdf"     >nul
copy "%SRC_SPP%\Sources\loi-83-634-13-juillet-1983-droits-obligations-fonctionnaires.pdf"                   "%DST_SPP%\sources\loi-83-634-droits-obligations.pdf"           >nul
copy "%SRC_SPP%\Sources\loi-84-53-26-janvier-1984-dispositions-statutaires-FPT.pdf"                         "%DST_SPP%\sources\loi-84-53-fpt.pdf"           >nul
copy "%SRC_SPP%\Sources\loi-2016-483-20-avril-2016-déontologie-droits-obligations.pdf"                      "%DST_SPP%\sources\loi-2016-483-deontologie.pdf" >nul
copy "%SRC_SPP%\Sources\loi-2019-828-6-août-2019-transformation-fonction-publique.pdf"                      "%DST_SPP%\sources\loi-2019-828-transformation-fp.pdf"          >nul
echo     Statut SPP : termine.

echo.
echo [5/5] Copie de Divers et Concours...
set "SRC_DIV=Bibliotheque\3) Divers"
set "DST_DIV=docs\divers"

copy "%SRC_DIV%\Décret n° 2005-1156 du 13 septembre 2005 relatif au plan communal de sauvegarde et pris pour application de l_article 13 de la loi n° 2004-811 du 13 août 2004 de modernisation de la sécurité civile - Légifrance.pdf"  "%DST_DIV%\decret-2005-1156-pcs.pdf"  >nul
copy "%SRC_DIV%\Section 2 _ Classement des établissements (Articles R143-18 à R143-21) - Légifrance.pdf"     "%DST_DIV%\erp-classement-r143-18-21.pdf"   >nul
echo     Divers : termine.

set "SRC_CC=Bibliotheque\4) Textes Structurant le Concours"
set "DST_CC=docs\concours"

copy "%SRC_CC%\Arrêté du 30 novembre 2020 relatif aux programmes des concours et examens professionnels des cadres d_emplois de sapeurs-pompiers professionnels - Légifrance.pdf"  "%DST_CC%\arrete-30-novembre-2020-programmes.pdf"  >nul
copy "%SRC_CC%\Décret n° 2012-520 du 20 avril 2012 portant statut particulier du cadre d_emplois des sapeurs et caporaux de sapeurs-pompiers professionnels - Légifrance.pdf"     "%DST_CC%\decret-2012-520-statut-sapeurs-caporaux.pdf"  >nul
copy "%SRC_CC%\Décret n° 2013-593 du 5 juillet 2013 relatif aux conditions générales de recrutement et d_avancement de grade et portant dispositions statutaires diverses applicables aux fonctionnaires de la fonction publique territoriale - Légifrance.pdf"  "%DST_CC%\decret-2013-593-recrutement-avancement.pdf"  >nul
copy "%SRC_CC%\Décret n° 2020-1474 du 30 novembre 2020 fixant les modalités d_organisation des concours et examens professionnels des cadres d_emplois de sapeurs-pompiers professionnels - Légifrance.pdf"  "%DST_CC%\decret-2020-1474-modalites-concours.pdf"  >nul
echo     Concours : termine.

echo.
echo ============================================================
echo  TERMINE. Verifier le dossier docs
echo ============================================================
echo.
pause
