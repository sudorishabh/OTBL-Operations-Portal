-- ============================================================
-- OTBL Demo Data
-- Database: otbl
-- All demo users share the same password as the existing admin
-- (rishabhnegi175@gmail.com). To use a different password,
-- replace all password hashes with a fresh bcrypt hash.
-- ============================================================

USE otbl;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE bio_oil_zapping;
TRUNCATE TABLE bio_samples;
TRUNCATE TABLE biorem_cont_soil;
TRUNCATE TABLE clean_soil_area;
TRUNCATE TABLE excav_cont_soil;
TRUNCATE TABLE lifting_oil_slush;
TRUNCATE TABLE refill_excav_soil;
TRUNCATE TABLE trans_cont_soil;
TRUNCATE TABLE site_activity_items;
TRUNCATE TABLE work_order_site_docs;
TRUNCATE TABLE wo_site_oprtr_docs;
TRUNCATE TABLE wo_site_expenses;
TRUNCATE TABLE work_order_site_users;
TRUNCATE TABLE work_order_sites;
TRUNCATE TABLE schedule_of_rates;
TRUNCATE TABLE work_orders;
TRUNCATE TABLE proposals;
TRUNCATE TABLE site_users;
TRUNCATE TABLE sites;
TRUNCATE TABLE office_users;
TRUNCATE TABLE contractors;
TRUNCATE TABLE client_contacts;
TRUNCATE TABLE clients;
TRUNCATE TABLE offices;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (id, name, email, password, contact_number, role, created_by, status, created_at, updated_at) VALUES
(1,  'Rishabh Negi',     'rishabhnegi175@gmail.com',      '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9717310698', 'admin',    NULL, 'active',   '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
(2,  'Rajesh Kumar',     'rajesh.kumar@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9811200001', 'office_manager',  1, 'active',   '2024-01-05 09:00:00', '2024-01-05 09:00:00'),
(3,  'Priya Sharma',     'priya.sharma@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9822300002', 'office_manager',  1, 'active',   '2024-01-05 09:30:00', '2024-01-05 09:30:00'),
(4,  'Amit Verma',       'amit.verma@otbl.in',            '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9833400003', 'office_manager',  1, 'active',   '2024-01-06 09:00:00', '2024-01-06 09:00:00'),
(5,  'Sunita Patel',     'sunita.patel@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9844500004', 'office_manager',  1, 'active',   '2024-01-06 09:30:00', '2024-01-06 09:30:00'),
(6,  'Vikram Singh',     'vikram.singh@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9855600005', 'office_manager',  1, 'active',   '2024-01-07 09:00:00', '2024-01-07 09:00:00'),
(7,  'Rahul Gupta',      'rahul.gupta@otbl.in',           '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9866700006', 'operator', 2, 'active',   '2024-01-10 09:00:00', '2024-01-10 09:00:00'),
(8,  'Deepak Joshi',     'deepak.joshi@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9877800007', 'operator', 2, 'active',   '2024-01-10 09:30:00', '2024-01-10 09:30:00'),
(9,  'Anjali Mishra',    'anjali.mishra@otbl.in',         '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9888900008', 'operator', 3, 'active',   '2024-01-11 09:00:00', '2024-01-11 09:00:00'),
(10, 'Sanjay Yadav',     'sanjay.yadav@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9899000009', 'operator', 3, 'active',   '2024-01-11 09:30:00', '2024-01-11 09:30:00'),
(11, 'Meena Tiwari',     'meena.tiwari@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9800100010', 'operator', 4, 'active',   '2024-01-12 09:00:00', '2024-01-12 09:00:00'),
(12, 'Ravi Pandey',      'ravi.pandey@otbl.in',           '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9811100011', 'operator', 4, 'active',   '2024-01-12 09:30:00', '2024-01-12 09:30:00'),
(13, 'Kavita Nair',      'kavita.nair@otbl.in',           '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9822200012', 'operator', 5, 'active',   '2024-01-13 09:00:00', '2024-01-13 09:00:00'),
(14, 'Suresh Reddy',     'suresh.reddy@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9833300013', 'operator', 5, 'active',   '2024-01-13 09:30:00', '2024-01-13 09:30:00'),
(15, 'Nisha Chopra',     'nisha.chopra@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9844400014', 'operator', 6, 'active',   '2024-01-14 09:00:00', '2024-01-14 09:00:00'),
(16, 'Arjun Malhotra',   'arjun.malhotra@otbl.in',        '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9855500015', 'operator', 6, 'active',   '2024-01-14 09:30:00', '2024-01-14 09:30:00'),
(17, 'Pooja Chauhan',    'pooja.chauhan@otbl.in',         '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9866600016', 'operator', 2, 'active',   '2024-01-15 09:00:00', '2024-01-15 09:00:00'),
(18, 'Manish Saxena',    'manish.saxena@otbl.in',         '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9877700017', 'operator', 3, 'active',   '2024-01-15 09:30:00', '2024-01-15 09:30:00'),
(19, 'Rekha Iyer',       'rekha.iyer@otbl.in',            '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9888800018', 'operator', 4, 'active',   '2024-01-16 09:00:00', '2024-01-16 09:00:00'),
(20, 'Dinesh Bhatt',     'dinesh.bhatt@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9899900019', 'operator', 5, 'inactive', 1, 'inactive', '2024-01-16 09:30:00', '2024-03-01 10:00:00'),
(21, 'Geeta Kapoor',     'geeta.kapoor@otbl.in',          '$2a$12$nQRUi1WOpjwqAEtF.JiD9uoluSQyZzA0PkzNroRgAcFtQeNmAgH2q', '9800000020', 'operator', 6, 'active',   '2024-01-17 09:00:00', '2024-01-17 09:00:00');

-- ============================================================
-- OFFICES
-- ============================================================
INSERT INTO offices (id, name, address, state, city, gst_number, pincode, email, status, created_at, updated_at) VALUES
(1, 'OTBL Delhi HQ',        'B-14, Okhla Industrial Area, Phase II',          'Delhi',         'New Delhi',  '07AAOCT5786Q1ZA', '110020', 'delhi@otbl.in',     'active', '2024-01-01 09:00:00', '2024-01-01 09:00:00'),
(2, 'OTBL Mumbai Office',   'Plot No. 52, MIDC, Andheri East',                'Maharashtra',   'Mumbai',     '27AAOCT5786Q2ZB', '400093', 'mumbai@otbl.in',    'active', '2024-01-01 09:30:00', '2024-01-01 09:30:00'),
(3, 'OTBL Chennai Office',  'Plot 7, SIPCOT Industrial Complex, Guindy',      'Tamil Nadu',    'Chennai',    '33AAOCT5786Q3ZC', '600097', 'chennai@otbl.in',   'active', '2024-01-02 09:00:00', '2024-01-02 09:00:00'),
(4, 'OTBL Kolkata Office',  '12, Park Circus, 7th Floor',                     'West Bengal',   'Kolkata',    '19AAOCT5786Q4ZD', '700017', 'kolkata@otbl.in',   'active', '2024-01-02 09:30:00', '2024-01-02 09:30:00'),
(5, 'OTBL Ahmedabad Office','301, GIFT City, Block No. 12',                   'Gujarat',       'Ahmedabad',  '24AAOCT5786Q5ZE', '380054', 'ahmedabad@otbl.in', 'active', '2024-01-03 09:00:00', '2024-01-03 09:00:00');

-- ============================================================
-- CLIENTS
-- ============================================================
INSERT INTO clients (id, name, address, state, city, pincode, gst_number, contact_number, email, status, created_at, updated_at) VALUES
(1, 'Oil and Natural Gas Corporation Ltd', 'Plot No. 5A, Nelson Mandela Marg, Vasant Kunj',    'Delhi',       'New Delhi', '110070', '07AAACO1234R1Z8', '01126754321', 'procurement@ongc.co.in',    'active', '2024-01-10 10:00:00', '2024-01-10 10:00:00'),
(2, 'Indian Oil Corporation Ltd',          'G-9, Ali Yavar Jung Marg, Bandra (E)',              'Maharashtra', 'Mumbai',    '400051', '27AAACI5678S1Z5', '02226595000', 'env@iocl.com',              'active', '2024-01-10 10:30:00', '2024-01-10 10:30:00'),
(3, 'Hindustan Petroleum Corp Ltd',        '17, Jamshedji Tata Road, Churchgate',               'Maharashtra', 'Mumbai',    '400020', '27AABCH1234A1ZC', '02222863900', 'hse@hpcl.in',               'active', '2024-01-11 10:00:00', '2024-01-11 10:00:00'),
(4, 'Bharat Petroleum Corp Ltd',           'Bharat Bhavan, 4 & 6 Currimbhoy Road',              'Maharashtra', 'Mumbai',    '400001', '27AABCB9876B1ZP', '02222714000', 'environment@bharatpetro.in', 'active', '2024-01-11 10:30:00', '2024-01-11 10:30:00'),
(5, 'Oil India Limited',                   'P.O. Duliajan, Dist. Dibrugarh',                    'Assam',       'Duliajan',  '786602', '18AABCO6789C1ZQ', '03742800100', 'env@oil-india.in',           'active', '2024-01-12 10:00:00', '2024-01-12 10:00:00'),
(6, 'Reliance Industries Ltd',             '3rd Floor, Maker Chambers IV, 222 Nariman Point',   'Maharashtra', 'Mumbai',    '400021', '27AAACR5055K1ZG', '02222785000', 'hse@ril.com',               'active', '2024-01-12 10:30:00', '2024-01-12 10:30:00'),
(7, 'Cairn India Ltd',                     '3rd Floor, Jeevan Bharati Tower II, Sansad Marg',   'Delhi',       'New Delhi', '110001', '07AABCC8765D1ZW', '01123739500', 'remediation@cairnindia.com', 'active', '2024-01-13 10:00:00', '2024-01-13 10:00:00'),
(8, 'Vedanta Resources Ltd',               'VEDANTA House, 75 Nehru Nagar, Kurla',               'Maharashtra', 'Mumbai',    '400024', '27AABCV4321E1ZL', '02267614500', 'environment@vedanta.co.in', 'active', '2024-01-13 10:30:00', '2024-01-13 10:30:00');

-- ============================================================
-- CLIENT CONTACTS (2 per client)
-- ============================================================
INSERT INTO client_contacts (id, client_id, name, designation, contact_number, email, contact_type, created_at, updated_at) VALUES
(1,  1, 'A.K. Srivastava',   'DGM - Environment',        '9810011001', 'aksrivastava@ongc.co.in',      'primary',   '2024-01-10 10:05:00', '2024-01-10 10:05:00'),
(2,  1, 'S. Mehra',          'Manager - HSE',             '9810011002', 'smehra@ongc.co.in',            'secondary', '2024-01-10 10:05:00', '2024-01-10 10:05:00'),
(3,  2, 'P.K. Das',          'GM - Environment & Safety', '9810022001', 'pkdas@iocl.com',               'primary',   '2024-01-10 10:35:00', '2024-01-10 10:35:00'),
(4,  2, 'Anita Rawat',       'Deputy Manager - Env',      '9810022002', 'arawat@iocl.com',              'secondary', '2024-01-10 10:35:00', '2024-01-10 10:35:00'),
(5,  3, 'B.N. Mishra',       'Chief Manager - HSE',       '9810033001', 'bnmishra@hpcl.in',             'primary',   '2024-01-11 10:05:00', '2024-01-11 10:05:00'),
(6,  3, 'Lalita Gupta',      'Sr. Engineer - Env',        '9810033002', 'lgupta@hpcl.in',               'secondary', '2024-01-11 10:05:00', '2024-01-11 10:05:00'),
(7,  4, 'R.C. Sharma',       'VP - Health, Safety & Env', '9810044001', 'rcsharma@bharatpetro.in',      'primary',   '2024-01-11 10:35:00', '2024-01-11 10:35:00'),
(8,  4, 'D. Krishnaswamy',   'AGM - Environment',         '9810044002', 'dkrishna@bharatpetro.in',      'secondary', '2024-01-11 10:35:00', '2024-01-11 10:35:00'),
(9,  5, 'J.P. Bora',         'General Manager - Env',     '9810055001', 'jpbora@oil-india.in',          'primary',   '2024-01-12 10:05:00', '2024-01-12 10:05:00'),
(10, 5, 'Mamata Hazarika',   'Manager - HSE & Environment','9810055002','mhazarika@oil-india.in',       'secondary', '2024-01-12 10:05:00', '2024-01-12 10:05:00'),
(11, 6, 'S.K. Ambani',       'Head - Environment',        '9810066001', 'skambani@ril.com',             'primary',   '2024-01-12 10:35:00', '2024-01-12 10:35:00'),
(12, 6, 'Preethi Nambiar',   'Sr. Manager - Env & Safety','9810066002', 'pnambiar@ril.com',             'secondary', '2024-01-12 10:35:00', '2024-01-12 10:35:00'),
(13, 7, 'M. Raghunathan',    'Director - HSE',            '9810077001', 'mraghunathan@cairnindia.com',  'primary',   '2024-01-13 10:05:00', '2024-01-13 10:05:00'),
(14, 7, 'Divya Kapoor',      'Manager - Remediation',     '9810077002', 'dkapoor@cairnindia.com',       'secondary', '2024-01-13 10:05:00', '2024-01-13 10:05:00'),
(15, 8, 'T. Agarwal',        'VP - Sustainability & Env', '9810088001', 'tagarwal@vedanta.co.in',       'primary',   '2024-01-13 10:35:00', '2024-01-13 10:35:00'),
(16, 8, 'Shobha Menon',      'AGM - Environment',         '9810088002', 'smenon@vedanta.co.in',         'secondary', '2024-01-13 10:35:00', '2024-01-13 10:35:00');

-- ============================================================
-- OFFICE USERS (managers and operators assigned to offices)
-- ============================================================
INSERT INTO office_users (id, user_id, office_id, assigned_by, role, created_at, updated_at) VALUES
-- Managers (one per office)
(1,  2,  1, 1, 'office_manager', '2024-01-08 09:00:00', '2024-01-08 09:00:00'),
(2,  3,  2, 1, 'office_manager', '2024-01-08 09:00:00', '2024-01-08 09:00:00'),
(3,  4,  3, 1, 'office_manager', '2024-01-08 09:00:00', '2024-01-08 09:00:00'),
(4,  5,  4, 1, 'office_manager', '2024-01-08 09:00:00', '2024-01-08 09:00:00'),
(5,  6,  5, 1, 'office_manager', '2024-01-08 09:00:00', '2024-01-08 09:00:00'),
-- Operators assigned to offices
(6,  7,  1, 2, 'operator', '2024-01-12 09:00:00', '2024-01-12 09:00:00'),
(7,  8,  1, 2, 'operator', '2024-01-12 09:00:00', '2024-01-12 09:00:00'),
(8,  17, 1, 2, 'operator', '2024-01-12 09:00:00', '2024-01-12 09:00:00'),
(9,  9,  2, 3, 'operator', '2024-01-13 09:00:00', '2024-01-13 09:00:00'),
(10, 10, 2, 3, 'operator', '2024-01-13 09:00:00', '2024-01-13 09:00:00'),
(11, 18, 2, 3, 'operator', '2024-01-13 09:00:00', '2024-01-13 09:00:00'),
(12, 11, 3, 4, 'operator', '2024-01-14 09:00:00', '2024-01-14 09:00:00'),
(13, 12, 3, 4, 'operator', '2024-01-14 09:00:00', '2024-01-14 09:00:00'),
(14, 19, 3, 4, 'operator', '2024-01-14 09:00:00', '2024-01-14 09:00:00'),
(15, 13, 4, 5, 'operator', '2024-01-15 09:00:00', '2024-01-15 09:00:00'),
(16, 14, 4, 5, 'operator', '2024-01-15 09:00:00', '2024-01-15 09:00:00'),
(17, 20, 4, 5, 'operator', '2024-01-15 09:00:00', '2024-01-15 09:00:00'),
(18, 15, 5, 6, 'operator', '2024-01-16 09:00:00', '2024-01-16 09:00:00'),
(19, 16, 5, 6, 'operator', '2024-01-16 09:00:00', '2024-01-16 09:00:00'),
(20, 21, 5, 6, 'operator', '2024-01-16 09:00:00', '2024-01-16 09:00:00');

-- ============================================================
-- SITES (4 per office = 20 sites)
-- ============================================================
INSERT INTO sites (id, name, address, state, city, pincode, office_id, status, created_at, updated_at) VALUES
-- Office 1 (Delhi)
(1,  'Badarpur Oil Field',           'Badarpur, South Delhi',               'Delhi',         'New Delhi',  '110044', 1, 'active', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2,  'Tughlakabad Installation',     'Tughlakabad Industrial Area',         'Delhi',         'New Delhi',  '110044', 1, 'active', '2024-01-15 10:30:00', '2024-01-15 10:30:00'),
(3,  'Faridabad Depot Site',         'Sector 24, HSIDC Industrial Estate',  'Haryana',       'Faridabad',  '121005', 1, 'active', '2024-01-16 10:00:00', '2024-01-16 10:00:00'),
(4,  'Gurgaon Pipeline Junction',    'NH-48, Sector 37, Gurugram',          'Haryana',       'Gurugram',   '122001', 1, 'active', '2024-01-16 10:30:00', '2024-01-16 10:30:00'),
-- Office 2 (Mumbai)
(5,  'Uran Processing Plant',        'ONGC Colony, Uran, Raigad',           'Maharashtra',   'Uran',       '400702', 2, 'active', '2024-01-17 10:00:00', '2024-01-17 10:00:00'),
(6,  'Trombay Refinery Adjacent',    'BPCL Refinery Road, Trombay',         'Maharashtra',   'Mumbai',     '400074', 2, 'active', '2024-01-17 10:30:00', '2024-01-17 10:30:00'),
(7,  'Panvel Tank Farm',             'JNPT Road, Panvel',                   'Maharashtra',   'Panvel',     '410206', 2, 'active', '2024-01-18 10:00:00', '2024-01-18 10:00:00'),
(8,  'Mahul Creek Site',             'Mahul Village, Chembur',              'Maharashtra',   'Mumbai',     '400074', 2, 'active', '2024-01-18 10:30:00', '2024-01-18 10:30:00'),
-- Office 3 (Chennai)
(9,  'Manali Refinery Outskirts',    'Manali Industrial Estate, Manali',    'Tamil Nadu',    'Chennai',    '600068', 3, 'active', '2024-01-19 10:00:00', '2024-01-19 10:00:00'),
(10, 'Ennore Port Area',             'Ennore Industrial Belt',              'Tamil Nadu',    'Chennai',    '600057', 3, 'active', '2024-01-19 10:30:00', '2024-01-19 10:30:00'),
(11, 'Nagapattinam Pipeline Site',   'HPCL Pipeline Route, Nagapattinam',   'Tamil Nadu',    'Nagapattinam','611001',3, 'active', '2024-01-20 10:00:00', '2024-01-20 10:00:00'),
(12, 'Cuddalore Industrial Zone',    'SIPCOT Industrial Park, Cuddalore',   'Tamil Nadu',    'Cuddalore',  '607005', 3, 'active', '2024-01-20 10:30:00', '2024-01-20 10:30:00'),
-- Office 4 (Kolkata)
(13, 'Haldia Petrochemicals Area',   'Haldia Industrial Complex',           'West Bengal',   'Haldia',     '721602', 4, 'active', '2024-01-21 10:00:00', '2024-01-21 10:00:00'),
(14, 'Budge Budge Terminal',         'IOC Depot, Budge Budge',              'West Bengal',   'Kolkata',    '700137', 4, 'active', '2024-01-21 10:30:00', '2024-01-21 10:30:00'),
(15, 'Durgapur Pipeline Section',    'IOC Pipeline, Durgapur',              'West Bengal',   'Durgapur',   '713201', 4, 'active', '2024-01-22 10:00:00', '2024-01-22 10:00:00'),
(16, 'Duliajan Upstream Field',      'OIL India Production Block, Duliajan','Assam',         'Duliajan',   '786602', 4, 'active', '2024-01-22 10:30:00', '2024-01-22 10:30:00'),
-- Office 5 (Ahmedabad)
(17, 'Ankleshwar Oilfield',         'ONGC Ankleshwar Asset, Bharuch',       'Gujarat',       'Ankleshwar', '393010', 5, 'active', '2024-01-23 10:00:00', '2024-01-23 10:00:00'),
(18, 'Vadodara Refinery Boundary',   'IOCL Refinery Complex, Vadodara',     'Gujarat',       'Vadodara',   '391320', 5, 'active', '2024-01-23 10:30:00', '2024-01-23 10:30:00'),
(19, 'Kandla Port Tank Farm',        'Deendayal Port, Kandla',              'Gujarat',       'Gandhidham',  '370201', 5, 'active', '2024-01-24 10:00:00', '2024-01-24 10:00:00'),
(20, 'Hazira LNG Terminal Area',     'Shell-TOTAL LNG Terminal, Hazira',    'Gujarat',       'Surat',      '394270', 5, 'active', '2024-01-24 10:30:00', '2024-01-24 10:30:00');

-- ============================================================
-- SITE USERS (operators linked to sites)
-- ============================================================
INSERT INTO site_users (id, office_id, site_id, user_id, created_at, updated_at) VALUES
(1,  1, 1,  7,  '2024-01-20 09:00:00', '2024-01-20 09:00:00'),
(2,  1, 2,  8,  '2024-01-20 09:00:00', '2024-01-20 09:00:00'),
(3,  1, 3,  17, '2024-01-20 09:00:00', '2024-01-20 09:00:00'),
(4,  1, 4,  7,  '2024-01-20 09:00:00', '2024-01-20 09:00:00'),
(5,  2, 5,  9,  '2024-01-21 09:00:00', '2024-01-21 09:00:00'),
(6,  2, 6,  10, '2024-01-21 09:00:00', '2024-01-21 09:00:00'),
(7,  2, 7,  18, '2024-01-21 09:00:00', '2024-01-21 09:00:00'),
(8,  2, 8,  9,  '2024-01-21 09:00:00', '2024-01-21 09:00:00'),
(9,  3, 9,  11, '2024-01-22 09:00:00', '2024-01-22 09:00:00'),
(10, 3, 10, 12, '2024-01-22 09:00:00', '2024-01-22 09:00:00'),
(11, 3, 11, 19, '2024-01-22 09:00:00', '2024-01-22 09:00:00'),
(12, 3, 12, 11, '2024-01-22 09:00:00', '2024-01-22 09:00:00'),
(13, 4, 13, 13, '2024-01-23 09:00:00', '2024-01-23 09:00:00'),
(14, 4, 14, 14, '2024-01-23 09:00:00', '2024-01-23 09:00:00'),
(15, 4, 15, 13, '2024-01-23 09:00:00', '2024-01-23 09:00:00'),
(16, 4, 16, 14, '2024-01-23 09:00:00', '2024-01-23 09:00:00'),
(17, 5, 17, 15, '2024-01-24 09:00:00', '2024-01-24 09:00:00'),
(18, 5, 18, 16, '2024-01-24 09:00:00', '2024-01-24 09:00:00'),
(19, 5, 19, 21, '2024-01-24 09:00:00', '2024-01-24 09:00:00'),
(20, 5, 20, 15, '2024-01-24 09:00:00', '2024-01-24 09:00:00');

-- ============================================================
-- CONTRACTORS (2 per office = 10 contractors)
-- ============================================================
INSERT INTO contractors (id, office_id, name, contact_number, email, address, gst_number, pan_number, status, created_at, updated_at) VALUES
(1,  1, 'Enviro Clean Services Pvt Ltd',      '9910001001', 'info@enviroclean.in',     '23, Industrial Area, Phase I, New Delhi', '07AABCE1111A1Z5', 'AABCE1111A', 'active', '2024-02-01 10:00:00', '2024-02-01 10:00:00'),
(2,  1, 'GreenTech Remediation Pvt Ltd',      '9910002001', 'ops@greentech-rem.in',    'Plot 45, DSIIDC, Rohini, New Delhi',      '07AABCG2222B1Z3', 'AABCG2222B', 'active', '2024-02-01 10:30:00', '2024-02-01 10:30:00'),
(3,  2, 'EcoSafe Solutions Pvt Ltd',          '9920003001', 'contact@ecosafe.in',      'D-12, MIDC Turbhe, Navi Mumbai',          '27AABCE3333C1Z1', 'AABCE3333C', 'active', '2024-02-02 10:00:00', '2024-02-02 10:00:00'),
(4,  2, 'Petroclean Technologies Ltd',        '9920004001', 'info@petroclean.co.in',   'Sector 9, CBD Belapur, Navi Mumbai',      '27AABCP4444D1ZV', 'AABCP4444D', 'active', '2024-02-02 10:30:00', '2024-02-02 10:30:00'),
(5,  3, 'Southern Biotech Pvt Ltd',           '9930005001', 'ops@southernbiotech.in',  'SIPCOT Industrial Complex, Hosur',        '33AABCS5555E1ZT', 'AABCS5555E', 'active', '2024-02-03 10:00:00', '2024-02-03 10:00:00'),
(6,  3, 'NatureCure Environmental Pvt Ltd',   '9930006001', 'info@naturecure.in',      '14, Ambattur Industrial Estate, Chennai', '33AABCN6666F1ZR', 'AABCN6666F', 'active', '2024-02-03 10:30:00', '2024-02-03 10:30:00'),
(7,  4, 'Eastern Waste Management Pvt Ltd',   '9940007001', 'contact@ewm.co.in',       'Block EP, Sector V, Salt Lake, Kolkata',  '19AABCE7777G1ZP', 'AABCE7777G', 'active', '2024-02-04 10:00:00', '2024-02-04 10:00:00'),
(8,  4, 'Bengal Eco Consultants Ltd',         '9940008001', 'info@bengaleco.in',       'Dankuni Industrial Complex, Hooghly',     '19AABCB8888H1ZN', 'AABCB8888H', 'active', '2024-02-04 10:30:00', '2024-02-04 10:30:00'),
(9,  5, 'Gujarat Bioremediation Services',    '9950009001', 'gbs@gbsol.in',            'GIDC Estate, Ankleshwar, Bharuch',        '24AABCG9999I1ZL', 'AABCG9999I', 'active', '2024-02-05 10:00:00', '2024-02-05 10:00:00'),
(10, 5, 'Enviro West India Pvt Ltd',          '9950010001', 'ops@envirowest.in',        'Plot 102, GIDC, Sachin, Surat',           '24AABCE0101J1ZJ', 'AABCE0101J', 'active', '2024-02-05 10:30:00', '2024-02-05 10:30:00');

-- ============================================================
-- PROPOSALS (12 proposals, mix of statuses)
-- ============================================================
INSERT INTO proposals (id, client_id, office_id, code, title, document_key, description, proposal_submission_date, status, created_by, created_at, updated_at) VALUES
(1,  1, 1, 'PROP/DL/2024/001', 'Oil Spill Remediation - Badarpur Oilfield Phase I',         'docs/proposals/prop_dl_2024_001.pdf', 'Bioremediation and soil restoration for crude oil contamination at Badarpur oilfield.',  '2024-02-15 10:00:00', 'approved', 2, '2024-02-10 11:00:00', '2024-02-20 09:00:00'),
(2,  1, 1, 'PROP/DL/2024/002', 'Tughlakabad Pipeline Leak Restoration',                     'docs/proposals/prop_dl_2024_002.pdf', 'Emergency restoration of soil contaminated due to pipeline leak near Tughlakabad.',     '2024-03-01 10:00:00', 'approved', 2, '2024-02-25 11:00:00', '2024-03-05 09:00:00'),
(3,  2, 2, 'PROP/MB/2024/001', 'Uran Processing Plant Soil Bioremediation',                 'docs/proposals/prop_mb_2024_001.pdf', 'Comprehensive bioremediation of hydrocarbon-contaminated soil at IOCL Uran plant.',     '2024-02-20 10:00:00', 'approved', 3, '2024-02-15 11:00:00', '2024-02-25 09:00:00'),
(4,  3, 2, 'PROP/MB/2024/002', 'Trombay Refinery Boundary Soil Restoration',                'docs/proposals/prop_mb_2024_002.pdf', 'Restoration of oil-impacted soil at the western boundary of HPCL Trombay refinery.',    '2024-03-10 10:00:00', 'approved', 3, '2024-03-05 11:00:00', '2024-03-15 09:00:00'),
(5,  4, 2, 'PROP/MB/2024/003', 'Mahul Creek Contaminated Soil Excavation',                  'docs/proposals/prop_mb_2024_003.pdf', 'Excavation and disposal of heavily contaminated soil near Mahul Creek, Mumbai.',         '2024-04-01 10:00:00', 'pending',  3, '2024-03-25 11:00:00', '2024-03-25 11:00:00'),
(6,  5, 3, 'PROP/CH/2024/001', 'Manali Refinery Bioremediation Project',                    'docs/proposals/prop_ch_2024_001.pdf', 'In-situ bioremediation of TPH-contaminated soil at HPCL Manali refinery outskirts.',    '2024-03-15 10:00:00', 'approved', 4, '2024-03-10 11:00:00', '2024-03-20 09:00:00'),
(7,  5, 3, 'PROP/CH/2024/002', 'Nagapattinam Pipeline Corridor Restoration',                'docs/proposals/prop_ch_2024_002.pdf', 'Restoration of vegetation and soil along the HPCL pipeline corridor in Nagapattinam.',  '2024-04-05 10:00:00', 'approved', 4, '2024-04-01 11:00:00', '2024-04-10 09:00:00'),
(8,  5, 4, 'PROP/KL/2024/001', 'Duliajan Upstream Field Bioremediation',                    'docs/proposals/prop_kl_2024_001.pdf', 'Large-scale bioremediation of oil-contaminated soil at OIL India Duliajan field.',      '2024-03-20 10:00:00', 'approved', 5, '2024-03-15 11:00:00', '2024-03-25 09:00:00'),
(9,  6, 4, 'PROP/KL/2024/002', 'Haldia Petrochemicals Area Soil Restoration',               'docs/proposals/prop_kl_2024_002.pdf', 'Soil restoration and remediation around Haldia petrochemical complex.',                  '2024-04-15 10:00:00', 'rejected', 5, '2024-04-10 11:00:00', '2024-04-20 09:00:00'),
(10, 7, 5, 'PROP/AH/2024/001', 'Ankleshwar Oilfield Remediation Phase I',                   'docs/proposals/prop_ah_2024_001.pdf', 'Phase I remediation of Ankleshwar oilfield covering 15 contaminated plots.',            '2024-03-25 10:00:00', 'approved', 6, '2024-03-20 11:00:00', '2024-03-30 09:00:00'),
(11, 7, 5, 'PROP/AH/2024/002', 'Ankleshwar Oilfield Remediation Phase II',                  'docs/proposals/prop_ah_2024_002.pdf', 'Phase II covering deeper excavation and bioremediation at Ankleshwar oilfield.',        '2024-05-01 10:00:00', 'approved', 6, '2024-04-25 11:00:00', '2024-05-05 09:00:00'),
(12, 8, 5, 'PROP/AH/2024/003', 'Kandla Port Tank Farm Soil Decontamination',                'docs/proposals/prop_ah_2024_003.pdf', 'Decontamination of hydrocarbon-impacted soil at Kandla port tank farm facility.',       '2024-05-15 10:00:00', 'pending',  6, '2024-05-10 11:00:00', '2024-05-10 11:00:00');

-- ============================================================
-- WORK ORDERS (10 work orders)
-- ============================================================
INSERT INTO work_orders (id, code, agreement_number, rate_contract_number, title, proposal_id, client_id, office_id, start_date, end_date, handing_over_date, document_key, process_type, description, status, cancellation_reason, created_by, created_at, updated_at) VALUES
(1,  'WO/DL/2024/001', 'AGR/ONGC/DL/2024/001', 'RC/ONGC/2024/001', 'Badarpur Oilfield Bioremediation & Restoration',       1, 1, 1, '2024-03-01 08:00:00', '2024-09-30 18:00:00', '2024-09-30 18:00:00', 'docs/wo/wo_dl_2024_001.pdf', 'bioremediation_restoration', 'Combined bioremediation and restoration of 3.5 ha contaminated land.',    'completed',  NULL, 2, '2024-02-25 10:00:00', '2024-10-05 10:00:00'),
(2,  'WO/DL/2024/002', 'AGR/ONGC/DL/2024/002', 'RC/ONGC/2024/002', 'Tughlakabad Pipeline Leak Soil Restoration',            2, 1, 1, '2024-04-01 08:00:00', '2024-10-31 18:00:00', '2024-10-31 18:00:00', 'docs/wo/wo_dl_2024_002.pdf', 'restoration',                'Soil restoration at pipeline leak zone, 1.8 ha total area.',              'pending',    NULL, 2, '2024-03-28 10:00:00', '2024-03-28 10:00:00'),
(3,  'WO/MB/2024/001', 'AGR/IOCL/MB/2024/001', 'RC/IOCL/2024/001', 'Uran Plant Bioremediation - All Phases',                3, 2, 2, '2024-03-15 08:00:00', '2025-03-14 18:00:00', '2025-03-14 18:00:00', 'docs/wo/wo_mb_2024_001.pdf', 'bioremediation',             'Year-long in-situ bioremediation of 7 contaminated plots at Uran.',       'pending',    NULL, 3, '2024-03-10 10:00:00', '2024-03-10 10:00:00'),
(4,  'WO/MB/2024/002', 'AGR/HPCL/MB/2024/001', 'RC/HPCL/2024/001', 'Trombay Refinery Boundary Restoration',                 4, 3, 2, '2024-04-15 08:00:00', '2024-12-31 18:00:00', '2024-12-31 18:00:00', 'docs/wo/wo_mb_2024_002.pdf', 'restoration',                'Excavation and restoration of heavily oiled soil, western boundary.',      'pending',    NULL, 3, '2024-04-10 10:00:00', '2024-04-10 10:00:00'),
(5,  'WO/CH/2024/001', 'AGR/OIL/CH/2024/001',  'RC/OIL/2024/001',  'Manali Refinery In-Situ Bioremediation',                6, 5, 3, '2024-04-01 08:00:00', '2025-03-31 18:00:00', '2025-03-31 18:00:00', 'docs/wo/wo_ch_2024_001.pdf', 'bioremediation',             'In-situ bioremediation with microbial consortium, 5 contaminated zones.', 'pending',    NULL, 4, '2024-03-28 10:00:00', '2024-03-28 10:00:00'),
(6,  'WO/CH/2024/002', 'AGR/OIL/CH/2024/002',  'RC/OIL/2024/002',  'Nagapattinam Pipeline Corridor Restoration',             7, 5, 3, '2024-05-01 08:00:00', '2024-11-30 18:00:00', '2024-11-30 18:00:00', 'docs/wo/wo_ch_2024_002.pdf', 'restoration',                'Full restoration of 2.1 km pipeline corridor soil and vegetation.',       'completed',  NULL, 4, '2024-04-28 10:00:00', '2024-12-05 10:00:00'),
(7,  'WO/KL/2024/001', 'AGR/OIL/KL/2024/001',  'RC/OIL/2024/001',  'Duliajan Upstream Bioremediation Program',              8, 5, 4, '2024-04-15 08:00:00', '2025-04-14 18:00:00', '2025-04-14 18:00:00', 'docs/wo/wo_kl_2024_001.pdf', 'bioremediation_restoration', 'Large-scale program covering 12 plots, phased bioremediation.',           'pending',    NULL, 5, '2024-04-10 10:00:00', '2024-04-10 10:00:00'),
(8,  'WO/AH/2024/001', 'AGR/CAIRN/AH/2024/001','RC/CAIRN/2024/001','Ankleshwar Oilfield Remediation Phase I',               10, 7, 5, '2024-04-20 08:00:00', '2024-10-19 18:00:00', '2024-10-19 18:00:00', 'docs/wo/wo_ah_2024_001.pdf', 'bioremediation_restoration', 'Phase I - 15 plots, excavation + bioremediation + final restoration.',    'completed',  NULL, 6, '2024-04-15 10:00:00', '2024-10-22 10:00:00'),
(9,  'WO/AH/2024/002', 'AGR/CAIRN/AH/2024/002','RC/CAIRN/2024/002','Ankleshwar Oilfield Remediation Phase II',              11, 7, 5, '2024-11-01 08:00:00', '2025-04-30 18:00:00', '2025-04-30 18:00:00', 'docs/wo/wo_ah_2024_002.pdf', 'bioremediation',             'Phase II - deeper contamination, ex-situ bioremediation approach.',       'pending',    NULL, 6, '2024-10-25 10:00:00', '2024-10-25 10:00:00'),
(10, 'WO/DL/2024/003', 'AGR/ONGC/DL/2024/003', 'RC/ONGC/2024/003', 'Faridabad Depot Bioremediation',                        1, 1, 1, '2024-06-01 08:00:00', '2024-09-30 18:00:00', '2024-09-30 18:00:00', 'docs/wo/wo_dl_2024_003.pdf', 'bioremediation',             'Ex-situ bioremediation at Faridabad depot, 1.2 ha area.',                 'cancelled',  'Client revised scope; project merged with WO/DL/2024/001.', 2, '2024-05-28 10:00:00', '2024-06-10 09:00:00');

-- ============================================================
-- SCHEDULE OF RATES (2 per work order = 20 items)
-- ============================================================
INSERT INTO schedule_of_rates (id, work_order_id, activity, unit, estimated_quantity, rc_unit_rate, gst_percentage, unit_rate_inc_gst, total_cost, transportation_km, created_at, updated_at) VALUES
-- WO 1
(1,  1, 'clean_soil_area',                             'm²', 35000.00, 45.00,  18.00, 53.10,  1858500.00, NULL,  '2024-02-26 10:00:00', '2024-02-26 10:00:00'),
(2,  1, 'bioremediation_oil_contaminated_soil',        'm²', 35000.00, 320.00, 18.00, 377.60, 13216000.00, NULL, '2024-02-26 10:00:00', '2024-02-26 10:00:00'),
-- WO 2
(3,  2, 'excavation_oil_contaminated_soil',            'm³', 9000.00,  780.00, 18.00, 920.40, 8283600.00, NULL,  '2024-03-29 10:00:00', '2024-03-29 10:00:00'),
(4,  2, 'transportation_contaminated_soil',            'MT', 18000.00, 420.00, 18.00, 495.60, 8920800.00, 45.00, '2024-03-29 10:00:00', '2024-03-29 10:00:00'),
-- WO 3
(5,  3, 'lifting_oily_slush_or_recovery_of_oil',       'MT', 2500.00,  1250.00,18.00,1475.00, 3687500.00, NULL,  '2024-03-11 10:00:00', '2024-03-11 10:00:00'),
(6,  3, 'bioremediation_oil_contaminated_soil',        'm²', 28000.00, 310.00, 18.00, 365.80, 10242400.00, NULL, '2024-03-11 10:00:00', '2024-03-11 10:00:00'),
-- WO 4
(7,  4, 'excavation_oil_contaminated_soil',            'm³', 12000.00, 800.00, 18.00, 944.00, 11328000.00, NULL, '2024-04-11 10:00:00', '2024-04-11 10:00:00'),
(8,  4, 'refilling_excavated_oil_contaminated_soil_land','m³',12000.00, 350.00, 18.00, 413.00, 4956000.00, NULL, '2024-04-11 10:00:00', '2024-04-11 10:00:00'),
-- WO 5
(9,  5, 'bioremediation_oil_contaminated_soil',        'm²', 50000.00, 330.00, 18.00, 389.40, 19470000.00, NULL, '2024-03-29 10:00:00', '2024-03-29 10:00:00'),
(10, 5, 'clean_soil_area',                             'm²', 50000.00, 48.00,  18.00, 56.64,  2832000.00, NULL,  '2024-03-29 10:00:00', '2024-03-29 10:00:00'),
-- WO 6
(11, 6, 'excavation_oil_contaminated_soil',            'm³', 8500.00,  760.00, 18.00, 896.80, 7622800.00, NULL,  '2024-04-29 10:00:00', '2024-04-29 10:00:00'),
(12, 6, 'transportation_contaminated_soil',            'MT', 17000.00, 400.00, 18.00, 472.00, 8024000.00, 38.00, '2024-04-29 10:00:00', '2024-04-29 10:00:00'),
-- WO 7
(13, 7, 'bioremediation_oil_contaminated_soil',        'm²', 60000.00, 315.00, 18.00, 371.70, 22302000.00, NULL, '2024-04-11 10:00:00', '2024-04-11 10:00:00'),
(14, 7, 'lifting_oily_slush_or_recovery_of_oil',       'MT', 3500.00,  1300.00,18.00,1534.00, 5369000.00, NULL,  '2024-04-11 10:00:00', '2024-04-11 10:00:00'),
-- WO 8
(15, 8, 'clean_soil_area',                             'm²', 45000.00, 50.00,  18.00, 59.00,  2655000.00, NULL,  '2024-04-16 10:00:00', '2024-04-16 10:00:00'),
(16, 8, 'bioremediation_oil_contaminated_soil',        'm²', 45000.00, 340.00, 18.00, 401.20, 18054000.00, NULL, '2024-04-16 10:00:00', '2024-04-16 10:00:00'),
-- WO 9
(17, 9, 'bioremediation_oil_contaminated_soil',        'm²', 30000.00, 350.00, 18.00, 413.00, 12390000.00, NULL, '2024-10-26 10:00:00', '2024-10-26 10:00:00'),
(18, 9, 'excavation_oil_contaminated_soil',            'm³', 6000.00,  820.00, 18.00, 967.60, 5805600.00, NULL,  '2024-10-26 10:00:00', '2024-10-26 10:00:00'),
-- WO 10
(19, 10, 'bioremediation_oil_contaminated_soil',       'm²', 12000.00, 300.00, 18.00, 354.00, 4248000.00, NULL,  '2024-05-29 10:00:00', '2024-05-29 10:00:00'),
(20, 10, 'clean_soil_area',                            'm²', 12000.00, 42.00,  18.00, 49.56,  594720.00, NULL,   '2024-05-29 10:00:00', '2024-05-29 10:00:00');

-- ============================================================
-- WORK ORDER SITES (unique WO+site combos, 2 per WO = 20 rows)
-- ============================================================
INSERT INTO work_order_sites (id, work_order_id, client_id, site_id, date, end_date, process_type, job_number, area, installation, joint_estimate_number, land_owner_name, remarks, status, isCompleted, created_at, updated_at) VALUES
-- WO 1 (bioremediation_restoration) → sites 1, 2
(1,  1, 1, 1,  '2024-03-05 08:00:00', '2024-07-31 18:00:00', 'bioremediation_restoration', 'JOB/ONGC/DL/001/01', '2.1 ha, Block A', 'Open Field Installation',        'JE/ONGC/DL/001/01', 'ONGC Ltd',          'Plot A1 to A8, north section',          'completed', 1, '2024-03-01 10:00:00', '2024-08-05 10:00:00'),
(2,  1, 1, 2,  '2024-05-01 08:00:00', '2024-09-30 18:00:00', 'bioremediation_restoration', 'JOB/ONGC/DL/001/02', '1.4 ha, Block B', 'Subsurface Pipeline Corridor', 'JE/ONGC/DL/001/02', 'ONGC Ltd',          'Plots B1 to B5, near pump station',      'completed', 1, '2024-03-01 10:00:00', '2024-10-05 10:00:00'),
-- WO 2 (restoration) → sites 3, 4
(3,  2, 1, 3,  '2024-04-05 08:00:00', '2024-08-31 18:00:00', 'restoration',                'JOB/ONGC/DL/002/01', '1.0 ha, Zone-I',  'Underground Pipeline',          'JE/ONGC/DL/002/01', 'ONGC Ltd',          'Primary leak zone, excavation priority', 'pending',   0, '2024-03-29 10:00:00', '2024-03-29 10:00:00'),
(4,  2, 1, 4,  '2024-06-01 08:00:00', '2024-10-31 18:00:00', 'restoration',                'JOB/ONGC/DL/002/02', '0.8 ha, Zone-II', 'Pumping Station Area',          'JE/ONGC/DL/002/02', 'ONGC Ltd',          'Secondary contamination zone',          'pending',   0, '2024-03-29 10:00:00', '2024-03-29 10:00:00'),
-- WO 3 (bioremediation) → sites 5, 6
(5,  3, 2, 5,  '2024-03-20 08:00:00', '2024-09-30 18:00:00', 'bioremediation',             'JOB/IOCL/MB/001/01', '3.5 ha, Zone-A',  'Open Processing Area',          'JE/IOCL/MB/001/01', 'IOCL Ltd',          'Main contaminated area, 7 test plots',  'pending',   0, '2024-03-15 10:00:00', '2024-03-15 10:00:00'),
(6,  3, 2, 6,  '2024-05-15 08:00:00', '2025-01-15 18:00:00', 'bioremediation',             'JOB/IOCL/MB/001/02', '2.0 ha, Zone-B',  'Secondary Processing Unit',     'JE/IOCL/MB/001/02', 'IOCL Ltd',          'Peripheral contamination zone',         'pending',   0, '2024-03-15 10:00:00', '2024-03-15 10:00:00'),
-- WO 4 (restoration) → sites 7, 8
(7,  4, 3, 7,  '2024-04-20 08:00:00', '2024-10-31 18:00:00', 'restoration',                'JOB/HPCL/MB/001/01', '2.8 ha, Block-1', 'Tank Farm Boundary',            'JE/HPCL/MB/001/01', 'HPCL Ltd',          'Western boundary, heavy contamination',  'pending',   0, '2024-04-15 10:00:00', '2024-04-15 10:00:00'),
(8,  4, 3, 8,  '2024-06-01 08:00:00', '2024-12-31 18:00:00', 'restoration',                'JOB/HPCL/MB/001/02', '1.8 ha, Block-2', 'Coastal Buffer Zone',           'JE/HPCL/MB/001/02', 'HPCL Ltd',          'Adjacent to tidal inlet, priority area', 'pending',   0, '2024-04-15 10:00:00', '2024-04-15 10:00:00'),
-- WO 5 (bioremediation) → sites 9, 10
(9,  5, 5, 9,  '2024-04-10 08:00:00', '2025-01-31 18:00:00', 'bioremediation',             'JOB/OIL/CH/001/01',  '6.0 ha, Sector-A','Refinery Buffer Area',          'JE/OIL/CH/001/01',  'OIL India Ltd',     'In-situ treatment, 12 application zones','pending',   0, '2024-04-05 10:00:00', '2024-04-05 10:00:00'),
(10, 5, 5, 10, '2024-06-01 08:00:00', '2025-03-31 18:00:00', 'bioremediation',             'JOB/OIL/CH/001/02',  '4.0 ha, Sector-B','Port Approach Road Belt',       'JE/OIL/CH/001/02',  'OIL India Ltd',     'TPH > 8000 ppm, intensive treatment',   'pending',   0, '2024-04-05 10:00:00', '2024-04-05 10:00:00'),
-- WO 6 (restoration) → sites 11, 12
(11, 6, 5, 11, '2024-05-05 08:00:00', '2024-09-30 18:00:00', 'restoration',                'JOB/OIL/CH/002/01',  '1.2 km corridor', 'Pipeline Right-of-Way',         'JE/OIL/CH/002/01',  'OIL India Ltd',     'North section, 0-600m from valve point', 'completed', 1, '2024-04-29 10:00:00', '2024-10-05 10:00:00'),
(12, 6, 5, 12, '2024-07-01 08:00:00', '2024-11-30 18:00:00', 'restoration',                'JOB/OIL/CH/002/02',  '0.9 km corridor', 'Pipeline Right-of-Way',         'JE/OIL/CH/002/02',  'OIL India Ltd',     'South section, 600m-1500m, farmland',   'completed', 1, '2024-04-29 10:00:00', '2024-12-05 10:00:00'),
-- WO 7 (bioremediation_restoration) → sites 13, 14
(13, 7, 5, 13, '2024-04-20 08:00:00', '2024-12-31 18:00:00', 'bioremediation_restoration', 'JOB/OIL/KL/001/01',  '5.0 ha, Block-A', 'Production Well Cluster',       'JE/OIL/KL/001/01',  'OIL India Ltd',     'Cluster A, 6 well pads included',        'pending',   0, '2024-04-15 10:00:00', '2024-04-15 10:00:00'),
(14, 7, 5, 14, '2024-07-01 08:00:00', '2025-01-31 18:00:00', 'bioremediation_restoration', 'JOB/OIL/KL/001/02',  '4.0 ha, Block-B', 'Flow Station Area',             'JE/OIL/KL/001/02',  'OIL India Ltd',     'Flow station perimeter, 4 blocks',      'pending',   0, '2024-04-15 10:00:00', '2024-04-15 10:00:00'),
-- WO 8 (bioremediation_restoration) → sites 17, 18
(15, 8, 7, 17, '2024-04-25 08:00:00', '2024-08-31 18:00:00', 'bioremediation_restoration', 'JOB/CAIRN/AH/001/01','3.0 ha, Zone-I',  'Oil Production Pad',            'JE/CAIRN/AH/001/01','Cairn India Ltd',    'Phase I, plots 1–9, bioremediation done','completed', 1, '2024-04-20 10:00:00', '2024-09-05 10:00:00'),
(16, 8, 7, 18, '2024-06-15 08:00:00', '2024-10-19 18:00:00', 'bioremediation_restoration', 'JOB/CAIRN/AH/001/02','2.5 ha, Zone-II', 'Pipeline Gathering Station',    'JE/CAIRN/AH/001/02','Cairn India Ltd',    'Phase I, plots 10–15, restoration done','completed', 1, '2024-04-20 10:00:00', '2024-10-22 10:00:00'),
-- WO 9 (bioremediation) → sites 19, 20
(17, 9, 7, 19, '2024-11-05 08:00:00', '2025-03-31 18:00:00', 'bioremediation',             'JOB/CAIRN/AH/002/01','2.0 ha, Phase-II', 'Oil Pump Station',             'JE/CAIRN/AH/002/01','Cairn India Ltd',    'Deep contamination, ex-situ approach',  'pending',   0, '2024-10-26 10:00:00', '2024-10-26 10:00:00'),
(18, 9, 7, 20, '2025-01-01 08:00:00', '2025-04-30 18:00:00', 'bioremediation',             'JOB/CAIRN/AH/002/02','1.5 ha, Phase-II', 'LNG Loading Bay Area',         'JE/CAIRN/AH/002/02','Cairn India Ltd',    'Adjacent to LNG jetty, marine buffer',  'pending',   0, '2024-10-26 10:00:00', '2024-10-26 10:00:00'),
-- WO 10 (bioremediation – cancelled) → sites 3 under different WO (WO10 ≠ WO2 so site 3 can repeat)
(19, 10, 1, 3, '2024-06-05 08:00:00', '2024-09-30 18:00:00', 'bioremediation',             'JOB/ONGC/DL/003/01', '1.2 ha, Zone-A',  'Ex-Situ Treatment Cell',        'JE/ONGC/DL/003/01', 'ONGC Ltd',          'Cancelled – merged with WO/DL/2024/001','cancelled', 0, '2024-05-29 10:00:00', '2024-06-10 09:00:00'),
(20, 10, 1, 4, '2024-06-05 08:00:00', '2024-09-30 18:00:00', 'bioremediation',             'JOB/ONGC/DL/003/02', '0.8 ha, Zone-B',  'Buffer Zone Treatment',         'JE/ONGC/DL/003/02', 'ONGC Ltd',          'Cancelled – scope revision applied',    'cancelled', 0, '2024-05-29 10:00:00', '2024-06-10 09:00:00');

-- ============================================================
-- WORK ORDER SITE USERS (operators assigned to WO sites)
-- ============================================================
INSERT INTO work_order_site_users (id, work_order_site_id, user_id, created_at, updated_at) VALUES
(1,  1,  7,  '2024-03-05 10:00:00', '2024-03-05 10:00:00'),
(2,  1,  8,  '2024-03-05 10:00:00', '2024-03-05 10:00:00'),
(3,  2,  17, '2024-05-01 10:00:00', '2024-05-01 10:00:00'),
(4,  2,  8,  '2024-05-01 10:00:00', '2024-05-01 10:00:00'),
(5,  3,  7,  '2024-04-05 10:00:00', '2024-04-05 10:00:00'),
(6,  4,  17, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
(7,  5,  9,  '2024-03-20 10:00:00', '2024-03-20 10:00:00'),
(8,  5,  10, '2024-03-20 10:00:00', '2024-03-20 10:00:00'),
(9,  6,  18, '2024-05-15 10:00:00', '2024-05-15 10:00:00'),
(10, 7,  9,  '2024-04-20 10:00:00', '2024-04-20 10:00:00'),
(11, 8,  18, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
(12, 9,  11, '2024-04-10 10:00:00', '2024-04-10 10:00:00'),
(13, 9,  12, '2024-04-10 10:00:00', '2024-04-10 10:00:00'),
(14, 10, 19, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
(15, 11, 11, '2024-05-05 10:00:00', '2024-05-05 10:00:00'),
(16, 12, 19, '2024-07-01 10:00:00', '2024-07-01 10:00:00'),
(17, 13, 13, '2024-04-20 10:00:00', '2024-04-20 10:00:00'),
(18, 13, 14, '2024-04-20 10:00:00', '2024-04-20 10:00:00'),
(19, 14, 13, '2024-07-01 10:00:00', '2024-07-01 10:00:00'),
(20, 15, 15, '2024-04-25 10:00:00', '2024-04-25 10:00:00'),
(21, 15, 16, '2024-04-25 10:00:00', '2024-04-25 10:00:00'),
(22, 16, 21, '2024-06-15 10:00:00', '2024-06-15 10:00:00'),
(23, 17, 15, '2024-11-05 10:00:00', '2024-11-05 10:00:00'),
(24, 18, 16, '2025-01-01 10:00:00', '2025-01-01 10:00:00'),
(25, 11, 12, '2024-05-05 10:00:00', '2024-05-05 10:00:00');

-- ============================================================
-- WORK ORDER SITE DOCS
-- ============================================================
INSERT INTO work_order_site_docs (id, work_order_site_id, document_url, document_id, type, created_at, updated_at) VALUES
(1,  1,  'sharepoint/docs/wo1_site1_subwo.pdf',         'SP-WO1S1-001', 'sub_wo',               '2024-03-06 10:00:00', '2024-03-06 10:00:00'),
(2,  1,  'sharepoint/docs/wo1_site1_estimate.pdf',      'SP-WO1S1-002', 'estimate',             '2024-03-06 11:00:00', '2024-03-06 11:00:00'),
(3,  1,  'sharepoint/docs/wo1_site1_completion.pdf',    'SP-WO1S1-003', 'completion',           '2024-08-01 10:00:00', '2024-08-01 10:00:00'),
(4,  2,  'sharepoint/docs/wo1_site2_subwo.pdf',         'SP-WO1S2-001', 'sub_wo',               '2024-05-02 10:00:00', '2024-05-02 10:00:00'),
(5,  2,  'sharepoint/docs/wo1_site2_measurement.pdf',   'SP-WO1S2-002', 'measurement_sheet',    '2024-05-02 11:00:00', '2024-05-02 11:00:00'),
(6,  2,  'sharepoint/docs/wo1_site2_bills.pdf',         'SP-WO1S2-003', 'bills',                '2024-10-01 10:00:00', '2024-10-01 10:00:00'),
(7,  5,  'sharepoint/docs/wo3_site5_subwo.pdf',         'SP-WO3S5-001', 'sub_wo',               '2024-03-21 10:00:00', '2024-03-21 10:00:00'),
(8,  5,  'sharepoint/docs/wo3_site5_estimate.pdf',      'SP-WO3S5-002', 'estimate',             '2024-03-21 11:00:00', '2024-03-21 11:00:00'),
(9,  11, 'sharepoint/docs/wo6_site11_subwo.pdf',        'SP-WO6S11-001','sub_wo',               '2024-05-06 10:00:00', '2024-05-06 10:00:00'),
(10, 11, 'sharepoint/docs/wo6_site11_completion.pdf',   'SP-WO6S11-002','completion',           '2024-09-30 10:00:00', '2024-09-30 10:00:00'),
(11, 11, 'sharepoint/docs/wo6_site11_certificate.pdf',  'SP-WO6S11-003','completion_certificate','2024-10-01 10:00:00','2024-10-01 10:00:00'),
(12, 15, 'sharepoint/docs/wo8_site17_subwo.pdf',        'SP-WO8S17-001','sub_wo',               '2024-04-26 10:00:00', '2024-04-26 10:00:00'),
(13, 15, 'sharepoint/docs/wo8_site17_estimate.pdf',     'SP-WO8S17-002','estimate',             '2024-04-26 11:00:00', '2024-04-26 11:00:00'),
(14, 15, 'sharepoint/docs/wo8_site17_completion.pdf',   'SP-WO8S17-003','completion',           '2024-09-01 10:00:00', '2024-09-01 10:00:00'),
(15, 16, 'sharepoint/docs/wo8_site18_certificate.pdf',  'SP-WO8S18-001','completion_certificate','2024-10-20 10:00:00','2024-10-20 10:00:00');

-- ============================================================
-- OPERATOR UPLOADED DOCS
-- ============================================================
INSERT INTO wo_site_oprtr_docs (id, work_order_site_id, uploaded_by_user_id, description, file_name, document_url, document_id, created_at, updated_at) VALUES
(1,  1,  7,  'Daily progress report - Day 15, Block A',               'progress_day15_blockA.pdf',   'sharepoint/operator/op_doc_001.pdf', 'OD-001', '2024-03-20 17:00:00', '2024-03-20 17:00:00'),
(2,  1,  8,  'Soil sample TPH test results - April batch',            'tph_results_apr_batch.pdf',   'sharepoint/operator/op_doc_002.pdf', 'OD-002', '2024-04-10 16:00:00', '2024-04-10 16:00:00'),
(3,  2,  17, 'Field photograph collection - Block B survey',          'field_photos_blockB.zip',     'sharepoint/operator/op_doc_003.pdf', 'OD-003', '2024-05-15 17:00:00', '2024-05-15 17:00:00'),
(4,  5,  9,  'Microbial consortium application log - Month 1',        'microb_log_month1.xlsx',      'sharepoint/operator/op_doc_004.pdf', 'OD-004', '2024-04-20 17:00:00', '2024-04-20 17:00:00'),
(5,  5,  10, 'Soil moisture and temperature monitoring data',         'moisture_temp_data.xlsx',     'sharepoint/operator/op_doc_005.pdf', 'OD-005', '2024-05-01 17:00:00', '2024-05-01 17:00:00'),
(6,  11, 11, 'Excavation volume measurement - North section',        'excav_volume_north.pdf',      'sharepoint/operator/op_doc_006.pdf', 'OD-006', '2024-06-10 17:00:00', '2024-06-10 17:00:00'),
(7,  11, 12, 'Vehicle trip sheets - Contaminated soil transport',     'trip_sheets_june.xlsx',       'sharepoint/operator/op_doc_007.pdf', 'OD-007', '2024-06-30 17:00:00', '2024-06-30 17:00:00'),
(8,  15, 15, 'Treatment cell setup photographs - Zone I',            'treatment_cell_photos.zip',   'sharepoint/operator/op_doc_008.pdf', 'OD-008', '2024-05-05 17:00:00', '2024-05-05 17:00:00'),
(9,  15, 16, 'Nutrient amendment application record - Month 1-3',    'nutrient_records_q1.xlsx',    'sharepoint/operator/op_doc_009.pdf', 'OD-009', '2024-07-15 17:00:00', '2024-07-15 17:00:00'),
(10, 9,  11, 'In-situ monitoring well installation report',          'monitoring_well_install.pdf', 'sharepoint/operator/op_doc_010.pdf', 'OD-010', '2024-04-25 17:00:00', '2024-04-25 17:00:00');

-- ============================================================
-- SITE ACTIVITY ITEMS (linked to WO sites and SOR)
-- ============================================================
INSERT INTO site_activity_items (id, work_order_site_id, schedule_of_rates_id, activity, unit, created_at, updated_at) VALUES
-- WO site 1 (WO1, site1, bioremediation_restoration)
(1,  1,  1,  'clean_soil_area',                            'm²', '2024-03-06 10:00:00', '2024-03-06 10:00:00'),
(2,  1,  2,  'bioremediation_oil_contaminated_soil',       'm²', '2024-03-06 10:00:00', '2024-03-06 10:00:00'),
-- WO site 2 (WO1, site2, bioremediation_restoration)
(3,  2,  1,  'clean_soil_area',                            'm²', '2024-05-02 10:00:00', '2024-05-02 10:00:00'),
(4,  2,  2,  'bioremediation_oil_contaminated_soil',       'm²', '2024-05-02 10:00:00', '2024-05-02 10:00:00'),
-- WO site 3 (WO2, site3, restoration)
(5,  3,  3,  'excavation_oil_contaminated_soil',           'm³', '2024-04-06 10:00:00', '2024-04-06 10:00:00'),
(6,  3,  4,  'transportation_contaminated_soil',           'MT', '2024-04-06 10:00:00', '2024-04-06 10:00:00'),
-- WO site 5 (WO3, site5, bioremediation)
(7,  5,  5,  'lifting_oily_slush_or_recovery_of_oil',      'MT', '2024-03-21 10:00:00', '2024-03-21 10:00:00'),
(8,  5,  6,  'bioremediation_oil_contaminated_soiIl',       'm²', '2024-03-21 10:00:00', '2024-03-21 10:00:00'),
-- WO site 7 (WO4, site7, restoration)
(9,  7,  7,  'excavation_oil_contaminated_soil',           'm³', '2024-04-21 10:00:00', '2024-04-21 10:00:00'),
(10, 7,  8,  'refilling_excavated_oil_contaminated_soil_land','m³','2024-04-21 10:00:00','2024-04-21 10:00:00'),
-- WO site 9 (WO5, site9, bioremediation)
(11, 9,  9,  'bioremediation_oil_contaminated_soil',       'm²', '2024-04-11 10:00:00', '2024-04-11 10:00:00'),
(12, 9,  10, 'clean_soil_area',                            'm²', '2024-04-11 10:00:00', '2024-04-11 10:00:00'),
-- WO site 11 (WO6, site11, restoration)
(13, 11, 11, 'excavation_oil_contaminated_soil',           'm³', '2024-05-06 10:00:00', '2024-05-06 10:00:00'),
(14, 11, 12, 'transportation_contaminated_soil',           'MT', '2024-05-06 10:00:00', '2024-05-06 10:00:00'),
-- WO site 15 (WO8, site17, bioremediation_restoration)
(15, 15, 15, 'clean_soil_area',                            'm²', '2024-04-26 10:00:00', '2024-04-26 10:00:00');

-- ============================================================
-- CLEAN SOIL AREA activity records
-- ============================================================
INSERT INTO clean_soil_area (id, site_activity_id, work_order_site_id, estimated_quantity, amount, transportation_km, type, created_at, updated_at) VALUES
(1, 1,  1,  20000.00, 1062000.00, NULL,  'estimate_sub-wo', '2024-03-06 11:00:00', '2024-03-06 11:00:00'),
(2, 1,  1,  19500.00, 1035450.00, NULL,  'completion',      '2024-07-15 11:00:00', '2024-07-15 11:00:00'),
(3, 3,  2,  15000.00,  796500.00, NULL,  'estimate_sub-wo', '2024-05-02 11:00:00', '2024-05-02 11:00:00'),
(4, 3,  2,  14800.00,  785880.00, NULL,  'completion',      '2024-09-20 11:00:00', '2024-09-20 11:00:00'),
(5, 12, 9,  45000.00, 2548800.00, NULL,  'estimate_sub-wo', '2024-04-11 11:00:00', '2024-04-11 11:00:00');

-- ============================================================
-- LIFTING OIL SLUSH activity records
-- ============================================================
INSERT INTO lifting_oil_slush (id, site_activity_id, work_order_site_id, estimated_quantity, amount, transportation_km, type, created_at, updated_at) VALUES
(1, 7, 5, 1200.00, 1770000.00, NULL,  'estimate_sub-wo', '2024-03-21 11:00:00', '2024-03-21 11:00:00'),
(2, 7, 5, 1150.00, 1696250.00, NULL,  'completion',      '2024-07-10 11:00:00', '2024-07-10 11:00:00'),
(3, 7, 5,  300.00,  442500.00, NULL,  'estimate_sub-wo', '2024-03-21 12:00:00', '2024-03-21 12:00:00'),
(4, 7, 5,  280.00,  413300.00, NULL,  'completion',      '2024-07-10 12:00:00', '2024-07-10 12:00:00'),
(5, 7, 5,  200.00,  295000.00, NULL,  'estimate_sub-wo', '2024-03-21 13:00:00', '2024-03-21 13:00:00');

-- ============================================================
-- EXCAVATION CONTAMINATED SOIL activity records
-- ============================================================
INSERT INTO excav_cont_soil (id, site_activity_id, work_order_site_id, estimated_quantity, amount, transportation_km, type, created_at, updated_at) VALUES
(1, 5,  3,  4500.00, 4140000.00, NULL,  'estimate_sub-wo', '2024-04-06 11:00:00', '2024-04-06 11:00:00'),
(2, 5,  3,  4300.00, 3956400.00, NULL,  'completion',      '2024-09-01 11:00:00', '2024-09-01 11:00:00'),
(3, 9,  7,  6000.00, 5664000.00, NULL,  'estimate_sub-wo', '2024-04-21 11:00:00', '2024-04-21 11:00:00'),
(4, 13, 11, 4200.00, 3766560.00, NULL,  'estimate_sub-wo', '2024-05-06 11:00:00', '2024-05-06 11:00:00'),
(5, 13, 11, 4100.00, 3676960.00, NULL,  'completion',      '2024-09-25 11:00:00', '2024-09-25 11:00:00');

-- ============================================================
-- TRANSPORTATION CONTAMINATED SOIL activity records
-- ============================================================
INSERT INTO trans_cont_soil (id, site_activity_id, work_order_site_id, estimated_quantity, amount, transportation_km, type, created_at, updated_at) VALUES
(1, 6,  3,  9000.00, 4460400.00, 45.00, 'estimate_sub-wo', '2024-04-06 12:00:00', '2024-04-06 12:00:00'),
(2, 6,  3,  8600.00, 4262160.00, 45.00, 'completion',      '2024-09-01 12:00:00', '2024-09-01 12:00:00'),
(3, 14, 11, 8500.00, 4012000.00, 38.00, 'estimate_sub-wo', '2024-05-06 12:00:00', '2024-05-06 12:00:00'),
(4, 14, 11, 8200.00, 3870400.00, 38.00, 'completion',      '2024-09-25 12:00:00', '2024-09-25 12:00:00'),
(5, 6,  3,  4500.00, 2231760.00, 45.00, 'estimate_sub-wo', '2024-04-06 13:00:00', '2024-04-06 13:00:00');

-- ============================================================
-- REFILLING EXCAVATED SOIL activity records
-- ============================================================
INSERT INTO refill_excav_soil (id, site_activity_id, work_order_site_id, estimated_quantity, amount, transportation_km, type, created_at, updated_at) VALUES
(1, 10, 7, 6000.00, 2478000.00, NULL,  'estimate_sub-wo', '2024-04-21 12:00:00', '2024-04-21 12:00:00'),
(2, 10, 7, 5800.00, 2395400.00, NULL,  'completion',      '2024-10-15 12:00:00', '2024-10-15 12:00:00'),
(3, 10, 7, 3000.00, 1239000.00, NULL,  'estimate_sub-wo', '2024-04-21 13:00:00', '2024-04-21 13:00:00'),
(4, 10, 7, 2900.00, 1197700.00, NULL,  'completion',      '2024-10-15 13:00:00', '2024-10-15 13:00:00'),
(5, 10, 7, 1500.00,  619500.00, NULL,  'estimate_sub-wo', '2024-04-21 14:00:00', '2024-04-21 14:00:00');

-- ============================================================
-- BIOREMEDIATION CONTAMINATED SOIL activity records
-- ============================================================
INSERT INTO biorem_cont_soil (id, site_activity_id, work_order_site_id, estimated_quantity, amount, transportation_km, type, created_at, updated_at) VALUES
(1, 2,  1,  20000.00, 7552000.00, NULL, 'estimate_sub-wo', '2024-03-06 12:00:00', '2024-03-06 12:00:00'),
(2, 2,  1,  19200.00, 7249920.00, NULL, 'completion',      '2024-07-20 12:00:00', '2024-07-20 12:00:00'),
(3, 4,  2,  15000.00, 5664000.00, NULL, 'estimate_sub-wo', '2024-05-02 12:00:00', '2024-05-02 12:00:00'),
(4, 8,  5,  28000.00,10242400.00, NULL, 'estimate_sub-wo', '2024-03-21 12:00:00', '2024-03-21 12:00:00'),
(5, 11, 9,  50000.00,19470000.00, NULL, 'estimate_sub-wo', '2024-04-11 12:00:00', '2024-04-11 12:00:00');

-- ============================================================
-- BIO SAMPLES (TPH testing records linked to bioremediation)
-- ============================================================
INSERT INTO bio_samples (id, site_activity_id, work_order_site_id, biorem_cont_soil_id, tph_document_url, tph_value, application_month, created_at, updated_at) VALUES
(1, 2,  1,  1, 'sharepoint/lab/tph_wo1_s1_baseline.pdf',  18500.00, 'March 2024',     '2024-03-10 10:00:00', '2024-03-10 10:00:00'),
(2, 2,  1,  2, 'sharepoint/lab/tph_wo1_s1_month3.pdf',    12200.00, 'June 2024',      '2024-06-15 10:00:00', '2024-06-15 10:00:00'),
(3, 4,  2,  3, 'sharepoint/lab/tph_wo1_s2_baseline.pdf',  21300.00, 'May 2024',       '2024-05-10 10:00:00', '2024-05-10 10:00:00'),
(4, 8,  5,  4, 'sharepoint/lab/tph_wo3_s5_baseline.pdf',  15800.00, 'March 2024',     '2024-03-25 10:00:00', '2024-03-25 10:00:00'),
(5, 11, 9,  5, 'sharepoint/lab/tph_wo5_s9_baseline.pdf',  24600.00, 'April 2024',     '2024-04-15 10:00:00', '2024-04-15 10:00:00');

-- ============================================================
-- BIO OIL ZAPPING records
-- ============================================================
INSERT INTO bio_oil_zapping (id, site_activity_id, work_order_site_id, bio_sample_id, document_url, estimated_quantity, created_at, updated_at) VALUES
(1, 2, 1, 1, 'sharepoint/oilzap/zap_wo1_s1_app1.pdf', 500.00,  '2024-04-01 10:00:00', '2024-04-01 10:00:00'),
(2, 2, 1, 2, 'sharepoint/oilzap/zap_wo1_s1_app2.pdf', 480.00,  '2024-07-01 10:00:00', '2024-07-01 10:00:00'),
(3, 4, 2, 3, 'sharepoint/oilzap/zap_wo1_s2_app1.pdf', 380.00,  '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
(4, 8, 5, 4, 'sharepoint/oilzap/zap_wo3_s5_app1.pdf', 700.00,  '2024-04-20 10:00:00', '2024-04-20 10:00:00'),
(5, 11,9, 5, 'sharepoint/oilzap/zap_wo5_s9_app1.pdf', 1200.00, '2024-05-10 10:00:00', '2024-05-10 10:00:00');

-- ============================================================
-- WORK ORDER SITE EXPENSES (30 expenses across multiple sites)
-- ============================================================
INSERT INTO wo_site_expenses (id, work_order_site_id, expense_type, contractor_id, description, amount, expense_date, invoice_number, notes, activity_key, quantity, is_exceeded, document_url, document_id, created_by, created_at, updated_at) VALUES
-- WO Site 1 expenses (completed site, lots of activity)
(1,  1, 'contractor_payment', 1, 'Enviro Clean – Soil excavation machinery deployment Month 1',          580000.00, '2024-03-31 00:00:00', 'INV/EC/2024/031', 'Mobilisation + 15 days ops',                        'excavation_oil_contaminated_soil', NULL,    0, 'sharepoint/bills/inv_ec_031.pdf', 'INV-001', 2, '2024-04-05 10:00:00', '2024-04-05 10:00:00'),
(2,  1, 'contractor_payment', 1, 'Enviro Clean – Bioremediation treatment Month 1',                      420000.00, '2024-04-30 00:00:00', 'INV/EC/2024/045', 'Microbial consortium + nutrients Month 1',           'bioremediation_oil_contaminated_soil', NULL, 0, 'sharepoint/bills/inv_ec_045.pdf', 'INV-002', 2, '2024-05-05 10:00:00', '2024-05-05 10:00:00'),
(3,  1, 'labour',             NULL,'Skilled labour – 20 workers × 26 days, March 2024',                  312000.00, '2024-03-31 00:00:00', 'LAB/DL/2024/031',  '20 workers @ ₹600/day',                             NULL, NULL,                                  0, NULL, NULL, 2, '2024-04-02 10:00:00', '2024-04-02 10:00:00'),
(4,  1, 'material',           NULL,'Microbial consortium & biostimulants – Batch 1',                      95000.00, '2024-03-25 00:00:00', 'MAT/BIO/2024/025', 'Bacillus spp. + nutrients, 50 kg pack × 10',         'bioremediation_oil_contaminated_soil', 500.00, 0, 'sharepoint/bills/mat_bio_025.pdf','MAT-001', 2, '2024-03-26 10:00:00', '2024-03-26 10:00:00'),
(5,  1, 'equipment',          NULL,'JCB Excavator rental – 15 days',                                     225000.00, '2024-03-31 00:00:00', 'EQP/JCB/2024/031', '1 JCB × 15 days @ ₹15000/day',                      'excavation_oil_contaminated_soil', NULL,    0, 'sharepoint/bills/eqp_jcb_031.pdf','EQP-001', 2, '2024-04-01 10:00:00', '2024-04-01 10:00:00'),
(6,  1, 'contractor_payment', 2, 'GreenTech – Soil cleaning & grading Phase 1',                          340000.00, '2024-04-30 00:00:00', 'INV/GT/2024/040',  'Surface cleaning, 20000 m² treated',                'clean_soil_area', 20000.00,              0, 'sharepoint/bills/inv_gt_040.pdf', 'INV-003', 2, '2024-05-03 10:00:00', '2024-05-03 10:00:00'),
(7,  1, 'miscellaneous',      NULL,'Site fencing, safety signage & PPE',                                  48000.00, '2024-03-10 00:00:00', 'MISC/DL/2024/010', 'Safety setup at start of project',                   NULL, NULL,                                  0, NULL, NULL, 7, '2024-03-11 10:00:00', '2024-03-11 10:00:00'),
-- WO Site 2 expenses
(8,  2, 'contractor_payment', 1, 'Enviro Clean – Site 2 Bioremediation Month 1',                         395000.00, '2024-05-31 00:00:00', 'INV/EC/2024/055', 'Month 1 treatment, Block B',                         'bioremediation_oil_contaminated_soil', NULL, 0, 'sharepoint/bills/inv_ec_055.pdf', 'INV-004', 2, '2024-06-04 10:00:00', '2024-06-04 10:00:00'),
(9,  2, 'labour',             NULL,'Unskilled labour – 15 workers × 26 days, May 2024',                  195000.00, '2024-05-31 00:00:00', 'LAB/DL/2024/055',  '15 workers @ ₹500/day',                             NULL, NULL,                                  0, NULL, NULL, 17, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
(10, 2, 'material',           NULL,'Organic amendments – compost + vermicompost 5 MT',                    75000.00, '2024-05-20 00:00:00', 'MAT/ORG/2024/050', 'Soil amendment for bioremediation enhancement',      'bioremediation_oil_contaminated_soil', 5000.00,0, 'sharepoint/bills/mat_org_050.pdf','MAT-002', 17, '2024-05-21 10:00:00', '2024-05-21 10:00:00'),
-- WO Site 3 expenses (restoration)
(11, 3, 'contractor_payment', 1, 'Enviro Clean – Excavation services Phase 1',                           650000.00, '2024-05-31 00:00:00', 'INV/EC/2024/060', 'Excavation of 4500 m³ contaminated soil',            'excavation_oil_contaminated_soil', 4500.00, 0, 'sharepoint/bills/inv_ec_060.pdf', 'INV-005', 2, '2024-06-03 10:00:00', '2024-06-03 10:00:00'),
(12, 3, 'equipment',          NULL,'Tipper trucks rental – 5 trucks × 30 days',                          450000.00, '2024-05-31 00:00:00', 'EQP/TRP/2024/055', '5 × 15 MT tippers @ ₹3000/day each',                'transportation_contaminated_soil', NULL,    0, 'sharepoint/bills/eqp_trp_055.pdf','EQP-002', 2, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
(13, 3, 'labour',             NULL,'Skilled operators – 8 × 30 days, May',                               192000.00, '2024-05-31 00:00:00', 'LAB/DL/2024/060',  '8 machine operators @ ₹800/day',                    NULL, NULL,                                  0, NULL, NULL, 7, '2024-06-02 10:00:00', '2024-06-02 10:00:00'),
-- WO Site 5 expenses (Mumbai bioremediation)
(14, 5, 'contractor_payment', 3, 'EcoSafe – Oil slush recovery Month 1',                                 520000.00, '2024-04-30 00:00:00', 'INV/ES/2024/045', 'Recovery of 1200 MT oily slush, Zone A',             'lifting_oily_slush_or_recovery_of_oil',1200.00,0,'sharepoint/bills/inv_es_045.pdf','INV-006', 3, '2024-05-04 10:00:00', '2024-05-04 10:00:00'),
(15, 5, 'contractor_payment', 3, 'EcoSafe – Bioremediation setup & Month 1 treatment',                   480000.00, '2024-04-30 00:00:00', 'INV/ES/2024/046', 'Treatment cell setup + first application',           'bioremediation_oil_contaminated_soil', NULL, 0, 'sharepoint/bills/inv_es_046.pdf', 'INV-007', 3, '2024-05-04 10:00:00', '2024-05-04 10:00:00'),
(16, 5, 'material',           NULL,'HCl acid solution for pH adjustment – 200 litres',                    18500.00, '2024-04-15 00:00:00', 'MAT/CHM/2024/015', 'pH correction reagent',                              'bioremediation_oil_contaminated_soil', 200.00, 0, 'sharepoint/bills/mat_chm_015.pdf','MAT-003', 9, '2024-04-16 10:00:00', '2024-04-16 10:00:00'),
(17, 5, 'labour',             NULL,'Labour team Mumbai – 25 workers × 26 days April',                    325000.00, '2024-04-30 00:00:00', 'LAB/MB/2024/045',  '25 workers @ ₹500/day',                             NULL, NULL,                                  0, NULL, NULL, 9, '2024-05-02 10:00:00', '2024-05-02 10:00:00'),
-- WO Site 9 expenses (Chennai bioremediation)
(18, 9, 'contractor_payment', 5, 'Southern Biotech – In-situ treatment Month 1',                         620000.00, '2024-05-31 00:00:00', 'INV/SB/2024/055', 'Bioremediation Month 1, 50000 m² Sector A',          'bioremediation_oil_contaminated_soil', NULL, 0, 'sharepoint/bills/inv_sb_055.pdf', 'INV-008', 4, '2024-06-04 10:00:00', '2024-06-04 10:00:00'),
(19, 9, 'material',           NULL,'Biosurfactant – 500 kg drums',                                        85000.00, '2024-05-10 00:00:00', 'MAT/BIO/2024/051', 'Rhamnolipid biosurfactant for soil washing',         'bioremediation_oil_contaminated_soil', 500.00, 0, 'sharepoint/bills/mat_bio_051.pdf','MAT-004', 11, '2024-05-11 10:00:00', '2024-05-11 10:00:00'),
(20, 9, 'equipment',          NULL,'Tilling machine rental – 30 days',                                   120000.00, '2024-05-31 00:00:00', 'EQP/TIL/2024/055', 'Deep soil tilling for bioremediation aeration',      'bioremediation_oil_contaminated_soil', NULL,    0, 'sharepoint/bills/eqp_til_055.pdf','EQP-003', 11, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
-- WO Site 11 expenses (Chennai restoration – completed)
(21, 11, 'contractor_payment', 5, 'Southern Biotech – Excavation & transport Phase 1',                   780000.00, '2024-06-30 00:00:00', 'INV/SB/2024/065', 'Excavation 4200 m³ + transport 8500 MT, North Sec', 'excavation_oil_contaminated_soil', 4200.00, 0, 'sharepoint/bills/inv_sb_065.pdf', 'INV-009', 4, '2024-07-04 10:00:00', '2024-07-04 10:00:00'),
(22, 11, 'contractor_payment', 6, 'NatureCure – Restoration planting & grading',                         350000.00, '2024-09-30 00:00:00', 'INV/NC/2024/095', 'Final restoration, vegetation + topsoil',           NULL, NULL,                                  0, 'sharepoint/bills/inv_nc_095.pdf', 'INV-010', 4, '2024-10-03 10:00:00', '2024-10-03 10:00:00'),
(23, 11, 'labour',            NULL,'Labour – 30 workers × 26 days, June 2024',                           390000.00, '2024-06-30 00:00:00', 'LAB/CH/2024/065',  '30 workers @ ₹500/day',                             NULL, NULL,                                  0, NULL, NULL, 11, '2024-07-01 10:00:00', '2024-07-01 10:00:00'),
-- WO Site 13 expenses (Kolkata bioremediation)
(24, 13, 'contractor_payment', 7, 'Eastern WM – Bioremediation setup Duliajan Block A',                  490000.00, '2024-05-31 00:00:00', 'INV/EW/2024/055', 'Site prep + treatment cell construction',            'bioremediation_oil_contaminated_soil', NULL, 0, 'sharepoint/bills/inv_ew_055.pdf', 'INV-011', 5, '2024-06-04 10:00:00', '2024-06-04 10:00:00'),
(25, 13, 'material',          NULL,'Fertiliser (NPK 10:26:26) – 2000 kg',                                 48000.00, '2024-05-20 00:00:00', 'MAT/NPK/2024/050', 'Nutrient amendment for biostimulation',              'bioremediation_oil_contaminated_soil', 2000.00, 0, 'sharepoint/bills/mat_npk_050.pdf','MAT-005', 13, '2024-05-21 10:00:00', '2024-05-21 10:00:00'),
-- WO Site 15 expenses (Ahmedabad bioremediation_restoration – completed)
(26, 15, 'contractor_payment', 9, 'Gujarat Bioremediation – Full treatment Phase I Zone I',               920000.00, '2024-07-31 00:00:00', 'INV/GB/2024/075', 'Treatment 45000 m², Ankleshwar Zone I',              'bioremediation_oil_contaminated_soil', NULL, 0, 'sharepoint/bills/inv_gb_075.pdf', 'INV-012', 6, '2024-08-04 10:00:00', '2024-08-04 10:00:00'),
(27, 15, 'contractor_payment', 9, 'Gujarat Bioremediation – Soil cleaning & grading Zone I',              285000.00, '2024-08-31 00:00:00', 'INV/GB/2024/085', 'Final surface cleaning 45000 m²',                   'clean_soil_area', 45000.00,              0, 'sharepoint/bills/inv_gb_085.pdf', 'INV-013', 6, '2024-09-03 10:00:00', '2024-09-03 10:00:00'),
(28, 15, 'labour',            NULL,'Labour – Ankleshwar site, 40 workers × 26 days July',                520000.00, '2024-07-31 00:00:00', 'LAB/AH/2024/075',  '40 workers @ ₹500/day',                             NULL, NULL,                                  0, NULL, NULL, 15, '2024-08-01 10:00:00', '2024-08-01 10:00:00'),
(29, 15, 'equipment',         NULL,'Reverse-osmosis leachate treatment unit rental – 3 months',           360000.00, '2024-07-31 00:00:00', 'EQP/RO/2024/075',  'RO unit for leachate management during treatment',   NULL, NULL,                                  0, 'sharepoint/bills/eqp_ro_075.pdf', 'EQP-004', 6, '2024-08-02 10:00:00', '2024-08-02 10:00:00'),
(30, 15, 'miscellaneous',     NULL,'Third-party audit & TPH verification sampling – Round 1',             95000.00, '2024-08-15 00:00:00', 'MISC/AH/2024/080', 'Independent lab testing 50 soil samples',            NULL, NULL,                                  0, 'sharepoint/bills/misc_ah_080.pdf','MISC-001',6, '2024-08-16 10:00:00', '2024-08-16 10:00:00');

-- ============================================================
-- End of demo data
-- ============================================================
