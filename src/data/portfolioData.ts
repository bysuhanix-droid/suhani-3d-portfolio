/**
 * ✏️ THE ONE FILE TO EDIT.
 * The observatory panels, the Quick View site and the Nova chatbot all read from here.
 * Everything below comes from Suhani's latest résumé.
 */

type Project = {
  id: string; name: string; kind: string; date: string; blurb: string;
  tags: string[]; points: string[]; link: string;
};

const projects: Project[] = [
  {
    id: 'P-01', name: 'E-Commerce Sales Data Analysis & Dashboard', kind: 'Data Analytics \u00b7 BI', date: 'Jan 2026',
    blurb: 'An end-to-end analytics pipeline over 50,000+ transactions, ending in an interactive Power BI dashboard.',
    tags: ['SQL', 'Power BI', 'Python', 'Pandas', 'Excel'],
    points: [
      'Analytics pipeline over 50,000+ transaction records using SQL (CTEs, window functions, joins) to surface revenue trends, seasonal demand and customer behaviour',
      'Interactive Power BI dashboard tracking 8+ KPIs \u2014 revenue growth, conversion rate and churn',
      'Standardised data from multiple sources through ETL with Python (Pandas) and Excel',
      'RFM and cohort analysis to find the high-value customer groups driving most of the revenue',
    ],
    link: 'https://github.com/bysuhanix-droid',
  },
  {
    id: 'P-02', name: 'Real-Time Collaborative Code Editor', kind: 'Full-stack \u00b7 Real-time', date: 'Jan 2025',
    blurb: 'A coding platform where several people edit the same file at once, tested across 10 concurrent rooms.',
    tags: ['React.js', 'Node.js', 'Express.js', 'Socket.IO', 'MongoDB'],
    points: [
      'Multi-user editing over Socket.IO WebSockets, with MongoDB holding persistent session storage',
      'Monaco Editor with multi-language syntax highlighting and auto-completion',
      'Debounced state synchronisation keeps every connected client consistent in near real time',
      'JWT authentication, live user presence and isolated Socket.IO namespaces per room',
      'MongoDB indexing that measurably cut query time under concurrent load testing',
    ],
    link: 'https://github.com/bysuhanix-droid/collab-code-editor',
  },
  {
    id: 'P-03', name: 'Network Packet Sniffer & Traffic Analyzer', kind: 'Cybersecurity \u00b7 Networking', date: 'Nov 2024',
    blurb: 'A monitoring tool that captures live packets across 5 protocol layers and flags suspicious traffic as it happens.',
    tags: ['Python', 'Scapy', 'PyQt', 'Socket Programming'],
    points: [
      'Captures and inspects live packet streams across TCP, UDP, HTTP, ICMP and DNS',
      'Multi-threaded capture engine with configurable protocol filters',
      'Signature-based deep packet inspection that flags port scans and suspicious traffic in real time',
      'PyQt GUI with live protocol distribution, network statistics and hex-dump logs',
    ],
    link: 'https://github.com/bysuhanix-droid',
  },
];

// How many of the projects mention a skill (matched on a few keywords) — drives the usage bars
const hay = projects.map((p) => `${p.name} ${p.tags.join(' ')} ${p.points.join(' ')}`.toLowerCase());
const uses = (...keys: string[]) => hay.filter((h) => keys.some((k) => h.includes(k.toLowerCase()))).length;
const skill = (n: string, ...keys: string[]): [string, number] => [n, uses(...(keys.length ? keys : [n]))];

export const P = {
  name: 'Suhani',
  role: 'Computer Science Engineering Student',
  location: 'Chandigarh, India',
  tagline: 'I build backend systems, real-time web apps and data analytics solutions.',
  resume: '/resume.pdf',
  siteUrl: 'https://portfolio-suhani21.vercel.app',

  summary:
    'Computer Science Engineering student with hands-on experience building backend systems, real-time web applications and data analytics solutions using Python, JavaScript, React.js, Node.js, SQL, MongoDB and Scikit-learn.',
  about: [
    'I\u2019m a Computer Science Engineering student at Chandigarh University, graduating in June 2028.',
    'I build backend systems, real-time web apps and analytics dashboards \u2014 scalable APIs, network monitoring tools and data pipelines \u2014 with extra exposure to machine learning and security vulnerability assessment.',
  ],
  stats: [
    { k: 'Projects built', v: '3' },
    { k: 'Vulnerabilities reported', v: '11' },
    { k: 'Certifications', v: '3' },
    { k: 'Graduating', v: '2028' },
  ],
  facts: ['Fluent in English and Hindi', 'Conversational in Italian and German', 'Open-source contributor \u00b7 active on LeetCode and HackerRank'],
  spoken: [
    { lang: 'English', hello: 'Hello', level: 'Fluent' },
    { lang: 'Hindi', hello: '\u0928\u092e\u0938\u094d\u0924\u0947', level: 'Fluent' },
    { lang: 'Italian', hello: 'Ciao', level: 'Conversational' },
    { lang: 'German', hello: 'Hallo', level: 'Conversational' },
  ],

  // second number = how many of the three projects use it (computed from the project text above)
  skills: [
    { group: 'Languages', items: [skill('Python'), skill('JavaScript', 'react', 'node'), skill('Java', 'java '), skill('C++', 'c++'), skill('SQL')] },
    { group: 'Frontend', items: [skill('React.js', 'react'), skill('HTML5', 'react'), skill('CSS3', 'react'), skill('Monaco Editor API', 'monaco'), skill('Responsive Design', 'react')] },
    { group: 'Backend', items: [skill('Node.js', 'node'), skill('Express.js', 'express'), skill('RESTful API Design', 'express'), skill('Socket.IO', 'socket.io'), skill('WebSockets', 'websocket')] },
    { group: 'Databases & Analytics', items: [skill('MongoDB'), skill('Mongoose', 'mongodb'), skill('SQL: CTEs & Window Functions', 'cte'), skill('Power BI'), skill('Excel'), skill('ETL Pipelines', 'etl')] },
    { group: 'ML & Data Science', items: [skill('Scikit-learn', 'scikit'), skill('Pandas'), skill('NumPy', 'numpy'), skill('Random Forest', 'random forest'), skill('KNN', 'knn'), skill('Feature Engineering', 'feature engineering')] },
    { group: 'Networking & Security', items: [skill('Scapy'), skill('Socket Programming'), skill('TCP/IP', 'tcp'), skill('UDP'), skill('HTTP'), skill('ICMP'), skill('Packet Analysis', 'packet')] },
    { group: 'Developer Tools', items: [skill('Git', 'git'), skill('GitHub', 'github'), skill('VS Code', 'monaco'), skill('Linux', 'linux'), skill('PyQt'), skill('OpenCV', 'opencv'), skill('MediaPipe', 'mediapipe')] },
  ] as { group: string; items: [string, number][] }[],

  // Résumé "Achievements & Experience" + "Activities"
  experience: [
    { role: 'Security researcher', org: 'CDAC BOSS Bug Bounty Program', period: 'Government web apps', points: ['Penetration testing and security assessment of government web applications', 'Identified and reported 11 vulnerabilities, including XSS and authentication bypass flaws', 'Each finding documented with step-by-step remediation recommendations'] },
    { role: 'Open-source contributor', org: 'GitHub', period: 'Open source', points: ['Bug fixes, documentation and feature additions across open-source projects'] },
    { role: 'Competitive programmer', org: 'LeetCode & HackerRank', period: 'Problem solving', points: ['Active on both platforms, practising data structures and algorithms'] },
  ],

  projects,

  research: [
    { title: 'Predicting student academic performance', status: '1st place', finding: 'Random Forest with ensemble methods and feature engineering \u2014 78% accuracy on a 10,000+ record dataset.' },
    { title: 'Finding flaws in government web apps', status: 'Reported', finding: '11 vulnerabilities including XSS and authentication bypass, each with step-by-step remediation advice.' },
    { title: 'Spotting suspicious network traffic', status: 'Built', finding: 'Signature-based deep packet inspection that flags port scans and unusual traffic in real time.' },
    { title: 'Who drives the revenue?', status: 'Built', finding: 'RFM and cohort segmentation over 50,000+ transactions to find the high-value customer groups.' },
  ],

  achievements: [
    { title: '1st Place \u2014 CodeMate Hackathon (Data & AI Track)', detail: 'Ranked 1st among 50 teams with a Random Forest model predicting student academic performance \u2014 78% accuracy on 10,000+ records', year: '', level: 5 },
    { title: 'CDAC BOSS Bug Bounty \u2014 11 vulnerabilities reported', detail: 'XSS and authentication bypass flaws found in government web applications, each with remediation steps', year: '', level: 4 },
    { title: 'Three Coursera certifications', detail: 'Python for Data Science, AI & Development \u00b7 Python Data Analytics \u00b7 5G Network Fundamentals', year: '', level: 3 },
  ],

  education: [
    {
      school: 'Chandigarh University', degree: 'B.E. in Computer Science Engineering', period: 'Expected June 2028',
      notes: 'Data Structures & Algorithms \u00b7 OOP \u00b7 DBMS \u00b7 Operating Systems \u00b7 Computer Networks \u00b7 Software Engineering \u00b7 AI',
      courses: ['Data Structures & Algorithms', 'Object-Oriented Programming', 'Database Management Systems', 'Operating Systems', 'Computer Networks', 'Software Engineering', 'Artificial Intelligence'],
    },
  ],

  certs: [
    { name: 'Python for Data Science, AI and Development', issuer: 'IBM (Coursera)', year: '', id: 'C-001' },
    { name: 'Python Data Analytics', issuer: 'IBM (Coursera)', year: '', id: 'C-002' },
    { name: '5G Network Fundamentals', issuer: 'Coursera', year: '', id: 'C-003' },
  ],

  contact: {
    email: 'by.suhani.x@gmail.com',
    phone: '+91 8091189625',
    github: 'https://github.com/bysuhanix-droid',
    linkedin: 'https://www.linkedin.com/in/bysuhanix',
    availability: 'Based in Chandigarh \u2014 reach out about internships, projects or collaboration',
  },
};
