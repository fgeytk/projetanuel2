-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 13 mai 2025 à 14:33
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `quiz`
--

-- --------------------------------------------------------

--
-- Structure de la table `joueur`
--

DROP TABLE IF EXISTS `joueur`;
CREATE TABLE IF NOT EXISTS `joueur` (
  `id_joueur` int NOT NULL AUTO_INCREMENT,
  `pseudo` char(50) DEFAULT NULL,
  `score` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_joueur`),
  UNIQUE KEY `pseudo` (`pseudo`)
) ENGINE=MyISAM AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `joueur_question`
--

DROP TABLE IF EXISTS `joueur_question`;
CREATE TABLE IF NOT EXISTS `joueur_question` (
  `id_joueur` int NOT NULL,
  `id_question` int NOT NULL,
  PRIMARY KEY (`id_joueur`,`id_question`),
  KEY `fk_question` (`id_question`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `question`
--

DROP TABLE IF EXISTS `question`;
CREATE TABLE IF NOT EXISTS `question` (
  `id_question` int NOT NULL AUTO_INCREMENT,
  `categorie` varchar(255) DEFAULT NULL,
  `nb_point` int DEFAULT NULL,
  `question` text,
  `reponse_vrai` varchar(255) DEFAULT NULL,
  `reponse_fausse1` varchar(255) DEFAULT NULL,
  `reponse_fausse2` varchar(255) DEFAULT NULL,
  `reponse_fausse3` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_question`)
) ENGINE=MyISAM AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `question`
--

INSERT INTO `question` (`id_question`, `categorie`, `nb_point`, `question`, `reponse_vrai`, `reponse_fausse1`, `reponse_fausse2`, `reponse_fausse3`) VALUES
(1, 'Géographie', 10, 'Quelle est la capitale de la France ?', 'Paris', 'Lyon', 'Marseille', 'Toulouse'),
(2, 'Histoire', 15, 'En quelle année a eu lieu la Révolution française ?', '1789', '1492', '1914', '1643'),
(3, 'Sciences', 20, 'Quel est l\'élément chimique de symbole O ?', 'Oxygène', 'Or', 'Osmium', 'Oganesson'),
(4, 'Cinéma', 10, 'Qui a réalisé le film \"Inception\" ?', 'Christopher Nolan', 'Steven Spielberg', 'Quentin Tarantino', 'Martin Scorsese'),
(5, 'Musique', 15, 'Quel groupe a sorti l\'album \"The Dark Side of the Moon\" ?', 'Pink Floyd', 'The Beatles', 'Led Zeppelin', 'Queen'),
(6, 'Technologie', 20, 'Quelle entreprise a développé le système d\'exploitation Android ?', 'Google', 'Microsoft', 'Apple', 'Samsung'),
(7, 'Sports', 10, 'Combien de joueurs composent une équipe de football sur le terrain ?', '11', '10', '9', '12'),
(8, 'Littérature', 15, 'Qui a écrit \"1984\" ?', 'George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'Jules Verne'),
(9, 'Nature', 10, 'Quel est l\'animal le plus grand du monde ?', 'Baleine bleue', 'Éléphant d\'Afrique', 'Girafe', 'Requin baleine'),
(10, 'Gastronomie', 5, 'De quel pays vient la pizza Margherita ?', 'Italie', 'France', 'Espagne', 'Grèce'),
(11, 'Géographie', 10, 'Quel est le plus long fleuve du monde ?', 'Nil', 'Amazon', 'Yangtsé', 'Mississippi'),
(12, 'Histoire', 15, 'Qui était le premier président des États-Unis ?', 'George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'),
(13, 'Sciences', 20, 'Quel est l’organe principal du système nerveux ?', 'Cerveau', 'Cœur', 'Foie', 'Poumons'),
(14, 'Cinéma', 10, 'Quel film a remporté l’Oscar du meilleur film en 2020 ?', 'Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood'),
(15, 'Musique', 15, 'Quel chanteur est surnommé \"The King of Pop\" ?', 'Michael Jackson', 'Elvis Presley', 'Prince', 'Freddie Mercury'),
(16, 'Technologie', 20, 'Quelle société a créé le système d’exploitation Windows ?', 'Microsoft', 'IBM', 'Apple', 'Google'),
(17, 'Sports', 10, 'Combien de minutes dure un match de football (hors prolongations) ?', '90', '80', '100', '120'),
(18, 'Littérature', 15, 'Qui a écrit \"Le Petit Prince\" ?', 'Antoine de Saint-Exupéry', 'Victor Hugo', 'Marcel Proust', 'Albert Camus'),
(19, 'Nature', 10, 'Quel est l’animal terrestre le plus rapide ?', 'Guépard', 'Lion', 'Antilope', 'Panthère'),
(20, 'Gastronomie', 5, 'Quelle spécialité est originaire du Japon ?', 'Sushi', 'Tacos', 'Pizza', 'Couscous'),
(21, 'Géographie', 10, 'Quel pays possède la plus grande superficie ?', 'Russie', 'Chine', 'Canada', 'États-Unis'),
(22, 'Géographie', 15, 'Quelle est la capitale du Canada ?', 'Ottawa', 'Toronto', 'Vancouver', 'Montréal'),
(23, 'Géographie', 20, 'Quel désert est le plus grand du monde ?', 'Antarctique', 'Sahara', 'Gobi', 'Kalahari'),
(24, 'Histoire', 10, 'Qui était le premier président des États-Unis ?', 'George Washington', 'Thomas Jefferson', 'Abraham Lincoln', 'John Adams'),
(25, 'Histoire', 15, 'En quelle année a commencé la Première Guerre mondiale ?', '1914', '1918', '1939', '1945'),
(26, 'Histoire', 20, 'Quel empire est tombé en 476 après J.-C. ?', 'Empire romain', 'Empire ottoman', 'Empire byzantin', 'Empire perse'),
(27, 'Sciences', 10, 'Quelle est la planète la plus proche du Soleil ?', 'Mercure', 'Vénus', 'Mars', 'Terre'),
(28, 'Sciences', 15, 'Quel est l\'élément chimique de symbole H ?', 'Hydrogène', 'Hélium', 'Mercure', 'Oxygène'),
(29, 'Sciences', 20, 'Combien de chromosomes possède un humain ?', '46', '23', '44', '48'),
(30, 'Cinéma', 10, 'Qui a réalisé \"Jurassic Park\" ?', 'Steven Spielberg', 'James Cameron', 'George Lucas', 'Peter Jackson'),
(31, 'Cinéma', 15, 'Quel film met en scène un naufrage célèbre ?', 'Titanic', 'Pirates des Caraïbes', 'Le Monde de Nemo', 'Waterworld'),
(32, 'Cinéma', 20, 'Qui joue le rôle principal dans \"Forrest Gump\" ?', 'Tom Hanks', 'Robin Williams', 'Leonardo DiCaprio', 'Brad Pitt'),
(81, 'Géographie', 20, 'Quelle est la capitale de l’Azerbaïdjan ?', 'Bakou', 'Erevan', 'Tbilissi', 'Tachkent'),
(34, 'Musique', 15, 'Quel groupe a composé \"Bohemian Rhapsody\" ?', 'Queen', 'The Beatles', 'The Rolling Stones', 'Led Zeppelin'),
(35, 'Musique', 20, 'Quel chanteur est surnommé \"The Boss\" ?', 'Bruce Springsteen', 'Billy Joel', 'Bob Dylan', 'Eric Clapton'),
(36, 'Technologie', 10, 'Quel moteur de recherche appartient à Google ?', 'Google', 'Bing', 'Yahoo', 'DuckDuckGo'),
(37, 'Technologie', 15, 'Quelle entreprise développe l\'iPhone ?', 'Apple', 'Samsung', 'Huawei', 'Sony'),
(38, 'Technologie', 20, 'En quelle année a été lancé Windows 95 ?', '1995', '1990', '2000', '1998'),
(39, 'Sports', 10, 'Combien de joueurs sur le terrain pour une équipe de basket ?', '5', '6', '7', '4'),
(40, 'Sports', 15, 'Combien de kilomètres fait un marathon ?', '42,195', '40', '45', '50'),
(41, 'Sports', 20, 'Qui a remporté la Coupe du Monde 2018 ?', 'France', 'Croatie', 'Allemagne', 'Brésil'),
(42, 'Littérature', 10, 'Qui a écrit \"Harry Potter\" ?', 'J.K. Rowling', 'Stephen King', 'Suzanne Collins', 'Tolkien'),
(43, 'Littérature', 15, 'Quel roman commence par \"Longtemps, je me suis couché de bonne heure\" ?', 'À la recherche du temps perdu', 'Le Rouge et le Noir', 'Madame Bovary', 'Germinal'),
(44, 'Littérature', 20, 'Qui a écrit \"Les Misérables\" ?', 'Victor Hugo', 'Émile Zola', 'Balzac', 'Maupassant'),
(45, 'Nature', 10, 'Quel animal est surnommé \"roi de la jungle\" ?', 'Lion', 'Tigre', 'Éléphant', 'Guépard'),
(46, 'Nature', 15, 'Quel est l\'arbre le plus haut du monde ?', 'Séquoia', 'Baobab', 'Chêne', 'Érable'),
(47, 'Nature', 20, 'Quel est l\'oiseau qui vole le plus vite ?', 'Faucon pèlerin', 'Aigle royal', 'Hirondelle', 'Albatros'),
(48, 'Gastronomie', 5, 'De quel pays vient le croissant ?', 'France', 'Autriche', 'Belgique', 'Italie'),
(49, 'Gastronomie', 5, 'Quelle est la boisson nationale du Japon ?', 'Saké', 'Thé vert', 'Soju', 'Vin de riz'),
(50, 'Gastronomie', 5, 'Quel fromage est italien ?', 'Mozzarella', 'Brie', 'Roquefort', 'Cheddar'),
(51, 'Géographie', 20, 'Quelle est la capitale du Bhoutan ?', 'Thimphou', 'Kathmandu', 'Dacca', 'New Delhi'),
(52, 'Géographie', 20, 'Quel pays enclavé est surnommé \"le toit de l\'Afrique\" ?', 'Lesotho', 'Swaziland', 'Rwanda', 'Ouganda'),
(53, 'Géographie', 20, 'Quel est le plus long fleuve d\'Asie ?', 'Yangtsé', 'Mékong', 'Gange', 'Indus'),
(54, 'Histoire', 20, 'En quelle année a eu lieu la chute de Constantinople ?', '1453', '1492', '1415', '1517'),
(55, 'Histoire', 20, 'Quel roi français fut surnommé \"le Roi Soleil\" ?', 'Louis XIV', 'Louis XVI', 'François Ier', 'Henri IV'),
(56, 'Histoire', 20, 'Qui était le premier empereur de Rome ?', 'Auguste', 'César', 'Néron', 'Caligula'),
(57, 'Sciences', 20, 'Quel est l’élément chimique de symbole W ?', 'Tungstène', 'Platine', 'Titane', 'Wolfram'),
(58, 'Sciences', 20, 'Comment s’appelle la plus grande lune de Saturne ?', 'Titan', 'Europe', 'Ganymède', 'Io'),
(59, 'Sciences', 20, 'Quelle unité mesure l’intensité d’un courant électrique ?', 'Ampère', 'Volt', 'Watt', 'Ohm'),
(60, 'Cinéma', 20, 'Qui a remporté l\'Oscar du meilleur réalisateur en 2020 ?', 'Bong Joon-ho', 'Sam Mendes', 'Todd Phillips', 'Quentin Tarantino'),
(61, 'Cinéma', 20, 'Quel film de Christopher Nolan parle des rêves imbriqués ?', 'Inception', 'Interstellar', 'Tenet', 'Memento'),
(62, 'Cinéma', 20, 'Dans quel film le personnage Travis Bickle apparaît-il ?', 'Taxi Driver', 'Goodfellas', 'Raging Bull', 'Heat'),
(63, 'Musique', 20, 'Quel groupe a sorti l\'album \"OK Computer\" ?', 'Radiohead', 'Muse', 'Coldplay', 'Blur'),
(64, 'Musique', 20, 'Qui est l\'auteur-compositeur de \"Hallelujah\" ?', 'Leonard Cohen', 'Jeff Buckley', 'Bob Dylan', 'Paul Simon'),
(65, 'Musique', 20, 'Quel mouvement musical est associé au groupe Nirvana ?', 'Grunge', 'Punk', 'Metal', 'Britpop'),
(66, 'Technologie', 20, 'Quel langage est principalement utilisé pour les applications Android natives ?', 'Java', 'Kotlin', 'Swift', 'Dart'),
(67, 'Technologie', 20, 'Quel est le protocole de transfert de fichiers le plus ancien ?', 'FTP', 'HTTP', 'SMTP', 'SSH'),
(68, 'Technologie', 20, 'Quel est le premier ordinateur personnel vendu au public ?', 'Altair 8800', 'Apple I', 'IBM PC', 'Commodore 64'),
(69, 'Sports', 20, 'Combien de fois Rafael Nadal a-t-il gagné Roland-Garros ?', '14', '12', '13', '15'),
(70, 'Sports', 20, 'Quel pays a remporté la Coupe du Monde de rugby 2019 ?', 'Afrique du Sud', 'Angleterre', 'Nouvelle-Zélande', 'Pays de Galles'),
(71, 'Sports', 20, 'Quelle épreuve olympique combine ski de fond et tir ?', 'Biathlon', 'Triathlon', 'Pentathlon', 'Decathlon'),
(72, 'Littérature', 20, 'Qui a écrit \"Crime et Châtiment\" ?', 'Fiodor Dostoïevski', 'Léon Tolstoï', 'Anton Tchekhov', 'Nicolas Gogol'),
(73, 'Littérature', 20, 'Quel auteur français a écrit \"Le Comte de Monte-Cristo\" ?', 'Alexandre Dumas', 'Victor Hugo', 'Honoré de Balzac', 'Emile Zola'),
(74, 'Littérature', 20, 'Qui a écrit \"Le Maître et Marguerite\" ?', 'Mikhaïl Boulgakov', 'Boris Pasternak', 'Vladimir Nabokov', 'Anton Tchekhov'),
(75, 'Nature', 20, 'Quel mammifère marin est le plus lourd ?', 'Baleine bleue', 'Cachalot', 'Orque', 'Morse'),
(76, 'Nature', 20, 'Quelle plante est la plus grande du monde ?', 'Sequoia géant', 'Baobab', 'Chêne', 'Sapin'),
(77, 'Nature', 20, 'Quel insecte est connu pour porter 850 fois son poids ?', 'Scarabaée rhinocéros', 'Fourmi', 'Sauterelle', 'Termite'),
(78, 'Gastronomie', 10, 'Quel ingrédient donne sa couleur noire à l\'encre de seiche ?', 'Mélanine', 'Sépia', 'Anthocyane', 'Chlorophylle'),
(79, 'Gastronomie', 10, 'Dans quel pays est né le sushi ?', 'Japon', 'Chine', 'Corée', 'Vietnam'),
(80, 'Gastronomie', 10, 'Quelle épice est la plus chère du monde au poids ?', 'Safran', 'Vanille', 'Cardamome', 'Caviar'),
(82, 'Géographie', 25, 'Quel pays possède le plus grand nombre de fuseaux horaires ?', 'France', 'Russie', 'États-Unis', 'Chine'),
(83, 'Histoire', 25, 'En quelle année est tombé Constantinople aux mains des Ottomans ?', '1453', '1492', '1517', '1415'),
(84, 'Histoire', 20, 'Qui était le successeur de Lénine à la tête de l’URSS ?', 'Joseph Staline', 'Léon Trotski', 'Nikita Khrouchtchev', 'Vladimir Ilitch Lénine'),
(85, 'Sciences', 25, 'Quel est le nom du physicien ayant postulé la mécanique quantique ?', 'Max Planck', 'Niels Bohr', 'Werner Heisenberg', 'Albert Einstein'),
(86, 'Sciences', 20, 'Quelle est la constante de Planck (h) en J·s ?', '6,626×10⁻³⁴', '3,14×10⁻⁷', '1,602×10⁻¹⁹', '9,81×10⁰'),
(87, 'Cinéma', 20, 'Quel film a remporté la Palme d’Or en 2019 ?', 'Parasite', 'Joker', 'Once Upon a Time…', 'Roma'),
(88, 'Cinéma', 25, 'Quel est le nom du compositeur des musiques de la saga \"Star Wars\" ?', 'John Williams', 'Hans Zimmer', 'Ennio Morricone', 'Howard Shore'),
(89, 'Musique', 20, 'Qui a composé l\'opéra \"La Flûte enchantée\" ?', 'Mozart', 'Beethoven', 'Wagner', 'Haydn'),
(90, 'Musique', 25, 'Quel artiste a sorti l’album \"Blackstar\" en 2016 ?', 'David Bowie', 'Prince', 'Lou Reed', 'Nick Cave'),
(91, 'Technologie', 25, 'Quel langage a été utilisé pour coder le premier navigateur web ?', 'C', 'Python', 'Java', 'Ruby'),
(92, 'Technologie', 20, 'En quelle année a été créé le protocole TCP/IP ?', '1974', '1989', '1991', '1968'),
(93, 'Sports', 20, 'Combien de titres Michael Schumacher a-t-il remportés en F1 ?', '7', '6', '8', '5'),
(94, 'Sports', 25, 'Quel pays a remporté la Coupe du Monde de rugby en 1995 ?', 'Afrique du Sud', 'Angleterre', 'Australie', 'Nouvelle-Zélande'),
(95, 'Littérature', 25, 'Quel roman débute par “Aujourd’hui, maman est morte.” ?', 'L\'Étranger', 'La Peste', 'Le Mythe de Sisyphe', 'La Chute'),
(96, 'Littérature', 20, 'Qui a écrit \"Le Maître et Marguerite\" ?', 'Mikhaïl Boulgakov', 'Anton Tchekhov', 'Léon Tolstoï', 'Boris Pasternak'),
(97, 'Nature', 20, 'Quel est le champignon le plus toxique au monde ?', 'Amanite phalloïde', 'Psilocybe cubensis', 'Coprin chevelu', 'Truffe noire'),
(98, 'Nature', 25, 'Quel est l’animal terrestre le plus rapide ?', 'Guépard', 'Antilope', 'Lion', 'Léopard'),
(99, 'Gastronomie', 20, 'Quel est le plat national du Pérou ?', 'Ceviche', 'Empanadas', 'Tacos', 'Feijoada'),
(100, 'Gastronomie', 25, 'Quelle boisson est obtenue par la fermentation de riz ?', 'Saké', 'Soju', 'Baijiu', 'Shochu');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
