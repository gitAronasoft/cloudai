--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assessments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.assessments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    case_id character varying NOT NULL,
    title text NOT NULL,
    template text DEFAULT 'General Care Assessments'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    action_items jsonb,
    transcript_text text,
    enhanced_transcript jsonb,
    audio_file_name text,
    audio_file_path text,
    processing_status text DEFAULT 'pending'::text,
    assigned_to character varying,
    assignment_status text DEFAULT 'assigned'::text,
    assigned_at timestamp without time zone,
    assigned_by character varying,
    due_date timestamp without time zone,
    assignment_notes text,
    completed_at timestamp without time zone,
    transcript_id character varying,
    dynamic_sections jsonb
);


ALTER TABLE public.assessments OWNER TO neondb_owner;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    client_name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    address text,
    case_details text,
    assigned_to character varying,
    assigned_at timestamp without time zone,
    created_by character varying
);


ALTER TABLE public.cases OWNER TO neondb_owner;

--
-- Name: recordings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.recordings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    assessment_id character varying NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    duration integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    processing_status text DEFAULT 'pending'::text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.recordings OWNER TO neondb_owner;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    sections jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'standard'::text NOT NULL
);


ALTER TABLE public.templates OWNER TO neondb_owner;

--
-- Name: transcripts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transcripts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    case_id character varying NOT NULL,
    recording_id character varying,
    raw_transcript text NOT NULL,
    enhanced_transcript jsonb,
    processing_status text DEFAULT 'pending'::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    assessment_id character varying
);


ALTER TABLE public.transcripts OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text,
    password text,
    role text DEFAULT 'team_member'::text NOT NULL,
    invitation_token text,
    invitation_status text DEFAULT 'pending'::text,
    invited_at timestamp without time zone,
    invited_by character varying,
    first_name text,
    last_name text,
    is_active integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    password_reset_token text,
    password_reset_expires timestamp without time zone
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.assessments (id, case_id, title, template, created_at, updated_at, action_items, transcript_text, enhanced_transcript, audio_file_name, audio_file_path, processing_status, assigned_to, assignment_status, assigned_at, assigned_by, due_date, assignment_notes, completed_at, transcript_id, dynamic_sections) FROM stdin;
e0110fa9-12ca-4630-b451-d4848af43020	af15f773-2f7e-4b56-bff5-9bf31f26edf0	Test	Global Template	2025-10-15 14:16:26.680104	2025-10-15 14:16:46.24	["Attempt to reschedule the assessment meeting at the earliest convenience.", "Provide alternative meeting formats, such as virtual or telephone options.", "Communicate clearly the importance and objectives of the meeting to the individual and their support network.", "Gather collateral information from family members, carers, and other professionals.", "Document all attempts to engage the individual and outcomes of these efforts.", "Review and update risk assessments to ensure individual safety during the assessment delay.", "Collaborate with multi-agency partners to gather necessary information.", "Establish and follow protocols for managing non-attendance in assessment meetings."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"meeting": "The meeting analysis underscores the importance of effective engagement strategies and contingency planning when individuals do not attend scheduled assessments. Recommendations include ensuring the meeting agenda is flexible to accommodate rescheduling, making use of multi-agency collaboration to obtain comprehensive information, and maintaining detailed records of all communications and decisions made. It is also advisable to establish clear protocols for no-shows, including criteria for proceeding with assessments in the person's absence and timelines for follow-up meetings.", "overview": "The overview section highlights the challenges faced due to the absence of the individual from the scheduled meeting. It is crucial to recognize the potential impact of non-attendance on the care assessment process, including delays in gathering essential information and making informed decisions. Recommendations include implementing strategies to improve meeting attendance, such as flexible scheduling, providing alternative formats like virtual meetings, and ensuring clear communication of meeting importance to the individual and related parties. Additionally, consider gathering collateral information from family members or other professionals to support the assessment in the absence of direct input.", "actionitems": "This section focuses on addressing the immediate and follow-up steps required due to the absence at the meeting. These action items include attempting to reschedule the meeting promptly to facilitate direct engagement, exploring alternative communication methods such as telephone or video calls, and documenting all efforts made to engage the individual. Additionally, review and update risk assessments to ensure the individual's safety and wellbeing are not compromised during delays. Collaborate with relevant stakeholders to monitor the situation proactively."}
1c58bc1c-514b-460e-ad77-9da3466574a0	41ff32c6-e190-44cb-bf50-431459024161	xsd	Global Template	2025-10-15 14:32:39.945529	2025-10-15 14:32:55.039	["Conduct a detailed cultural and linguistic needs assessment for the client.", "Identify if translation or interpretation services are required to support communication.", "Explore the impact of the client's multicultural interactions on their support network and wellbeing.", "Include cultural liaison or advocacy resources in the care planning process.", "Discuss and document any legal or immigration considerations affecting the client’s access to services.", "Ensure the care plan is culturally sensitive and addresses identified needs during care review meetings."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"meeting": "The meeting should include discussions focused on the client's cultural background, communication preferences, and any issues related to nationality or identity that affect their care. Involving relevant professionals such as interpreters or cultural liaison officers may be beneficial. The meeting aims to ensure that the care plan reflects the client's multicultural context and promotes inclusivity and accessibility.", "overview": "The client has mentioned having a conversation with an individual from two different countries, indicating a multicultural or cross-national context that may be relevant to their social or support needs. This suggests the client might be navigating complexities related to cultural identity, language barriers, or legal/immigration status, which could impact their wellbeing and access to services. An assessment should explore these dimensions to understand how the client's multicultural interactions affect their daily living, social inclusion, and any support requirements.", "actionitems": "It is recommended to clarify the nature of the relationship and interaction mentioned by the client, including identifying any cultural or linguistic needs that may influence care planning. The assessment should consider if translation services or culturally sensitive support is necessary. Additionally, exploring how the client's multicultural connections impact their support network and any potential challenges they face will help tailor services effectively."}
d062f1e8-37e7-46b9-b456-4ff752bcba52	95d2eda4-2533-4790-9b74-b35b601205c8	Local tsar	Global Template	2025-10-09 13:51:35.720145	2025-10-09 13:52:04.304	["Conduct a comprehensive face-to-face assessment covering all domains to gather detailed information.", "Arrange a home visit to evaluate the living environment for safety and accessibility.", "Obtain a full medical history including current medications and allergies.", "Assess Client A’s abilities regarding personal care, hygiene, communication, and nutrition.", "Engage with Client A to identify personal interests, important relationships, and cultural or religious needs.", "Review medication management to determine necessary support.", "Evaluate skin integrity and breathing status through physical assessment.", "Discuss end-of-life preferences in a sensitive and appropriate manner.", "Establish safe key access arrangements to Client A’s home for care providers.", "Develop a personalised care plan based on comprehensive assessment findings."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"hygiene": "No information provided regarding Client A’s hygiene practices or challenges. It is recommended to assess personal hygiene routines, independence levels, and any support needs to ensure Client A maintains good personal cleanliness and comfort.", "keysafe": "No reference to key safe or access arrangements to Client A’s residence. Evaluation of secure and accessible key arrangements is advised to facilitate safe and timely care delivery.", "overview": "The assessment of Client A is currently limited due to minimal information provided in the transcript. A comprehensive evaluation is necessary to determine care needs and create an appropriate support plan. Further detailed discussion and observation are recommended to gather essential information across all domains of care.", "allergies": "No allergies disclosed or known from the current information. It is imperative to verify and document any allergies to prevent adverse reactions.", "behaviour": "No behavioural observations or descriptions are provided. Assessing behaviour through observation and discussion with Client A and caregivers will help identify any behavioural support needs.", "breathing": "No information on respiratory status or breathing difficulties. Respiratory assessment may be required if indicated by medical history or observed symptoms.", "emotional": "Emotional wellbeing has not been addressed in the limited transcript. A thorough emotional and mental health assessment is recommended to identify any psychological support needs.", "nutrition": "Given the interest in eating, nutrition should be assessed in depth, including dietary intake, nutritional status, and risks such as malnutrition or dehydration.", "traveling": "No data on mobility or travel preferences and abilities. Assessment of mobility and transportation needs will support independence and access to services.", "background": "Background information about Client A’s cultural, social, and family history is missing. Gathering this information is important to provide person-centred care that respects the client’s identity and preferences.", "actionitems": "Due to insufficient data, no specific actions identified at this stage. Further assessment is needed.", "personalcare": "No details are available regarding Client A’s ability to manage personal care tasks such as dressing, toileting, or mobility. An assessment of personal care abilities is recommended to determine required assistance levels.", "communication": "The transcript includes minimal verbal communication from Client A. An in-depth communication assessment is required to understand communication abilities, preferences, and any augmentative support needs.", "skinintegrity": "No details provided related to skin integrity or risks of pressure sores. A skin inspection and risk assessment (e.g., Braden Scale) should be conducted to prevent complications.", "medicalhistory": "No medical history is documented in the transcript. It is crucial to obtain a detailed medical history, including existing medical conditions, past treatments, hospitalizations, and current healthcare needs to inform care planning.", "homeenvironment": "There is no data regarding the client’s living conditions or home environment safety. A home visit should be arranged to assess safety, accessibility, and suitability of the living space to identify potential hazards or modifications required.", "eatinganddrinking": "Client A expressed a liking for food, indicating eating is a positive area. Detailed assessment of nutritional intake, swallowing ability, dietary preferences, and risks related to eating and drinking should be completed.", "medicationsupport": "No data on current medication regime or support needs are available. A comprehensive medication review is necessary to ensure safe administration and adherence.", "religionpracticing": "No information about religious beliefs or practices. Understanding and supporting Client A’s spiritual needs should be part of holistic care assessment.", "interestsandhobbies": "Client A mentioned liking to eat some food, indicating interest in eating. Further exploration of specific foods and other hobbies or interests is advised to promote wellbeing and social interaction.", "whoandwhatisimportanttome": "No information on people or elements important to Client A. Identifying key relationships and personal values will facilitate meaningful engagement and tailored support.", "endoflifeconsiderationsandmylastwishes": "No information is provided about Client A’s end of life preferences or decisions. Sensitive discussions should be initiated when appropriate to document wishes and plan care accordingly."}
2fe4a34c-7e13-4b43-aac9-1698a92625db	95d2eda4-2533-4790-9b74-b35b601205c8	Test 2	Global Template	2025-10-10 09:03:15.381064	2025-10-10 09:03:37.765	["Schedule follow-up visits with the client to gather comprehensive information.", "Use alternative communication methods or involve speech and language therapy.", "Conduct a home environment safety and needs assessment.", "Obtain medical history and current medication list from healthcare providers.", "Engage family, carers, or other professionals for collateral information.", "Assess personal care needs including hygiene, mobility, and nutrition.", "Explore client’s social background, interests, and important relationships.", "Introduce discussions about end of life planning sensitively when appropriate.", "Check for allergies and establish or verify a key safe system.", "Monitor skin integrity and respiratory status regularly.", "Assess and support emotional wellbeing and provide psychological interventions as needed.", "Review transportation and social engagement opportunities."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"hygiene": "Due to the limited information from the client, there is insufficient data to evaluate hygiene needs. It is recommended to observe the client during subsequent visits or gather information from carers or family members to assess personal hygiene routines and any required support.", "keysafe": "No information regarding a key safe system was provided. Clarify whether a key safe is in place to facilitate emergency access by care providers or emergency services.", "overview": "The client provided minimal verbal input during the assessment, indicating potential communication barriers or reluctance to engage. A comprehensive assessment requires further engagement to understand the client's needs fully. It is recommended to schedule follow-up visits and use alternative communication methods if necessary to gather detailed information.", "allergies": "There is no information on any allergies. It is important to obtain a full allergy history from healthcare records or family to avoid adverse reactions.", "behaviour": "No behavioural information was provided. Observational assessments and input from family or carers should be used to identify behavioural patterns or challenges that may impact care.", "breathing": "No respiratory information was provided. Assess breathing patterns and history of respiratory conditions to determine any need for respiratory support or interventions.", "emotional": "Emotional state cannot be determined from the limited verbal input. Use observation and collateral information to assess emotional wellbeing and provide appropriate psychological support.", "nutrition": "Insufficient data regarding nutritional intake and needs. A nutritional assessment should be completed including weight monitoring and diet preferences.", "traveling": "There is no information on the client’s ability or opportunities to travel. Assess mobility and access to transportation to support social inclusion and healthcare access.", "background": "Background information such as family history, social circumstances, and previous care involvement was not obtained. Collecting this information will inform a holistic care approach.", "actionitems": "Further engagement with the client is necessary to collect comprehensive data across all assessment domains. Observations, collateral information, and subsequent assessments are essential to create an effective care plan.", "personalcare": "Insufficient data to determine personal care needs from the client’s brief verbal response. Further assessment to evaluate abilities and required assistance with dressing, grooming, toileting, and mobility is recommended.", "communication": "Client’s verbal response indicated minimal communication. Consider using communication aids, non-verbal cues, or involving speech and language therapists to support effective communication.", "skinintegrity": "Skin condition was not assessed. During future visits, inspect skin integrity to identify any risk of pressure ulcers or other dermatological issues, with referrals made as necessary.", "medicalhistory": "Medical history was not discussed. It is crucial to obtain detailed medical records or reports from healthcare providers to understand the client's health status and any conditions that affect care needs.", "homeenvironment": "No information about the home environment was provided. A home safety assessment should be conducted during the next visit to identify potential hazards, adaptations, or equipment needs to support safe living.", "eatinganddrinking": "No information regarding eating and drinking was provided. Assessment of nutritional status and swallowing capability is recommended to identify support needs.", "medicationsupport": "Medication needs and support requirements are unknown. Obtain a current medication list and assess the client’s ability to manage medications safely.", "religionpracticing": "No details on religious beliefs or practices were shared. Respect and accommodate religious preferences in care planning once known.", "interestsandhobbies": "No information regarding interests or hobbies was disclosed. Exploring these areas can enhance emotional wellbeing and social inclusion, thus should be addressed in follow-up assessments.", "whoandwhatisimportanttome": "The client did not identify any individuals or personal priorities. Engagement techniques should be employed to ascertain who and what matters to the client to facilitate person-centred care.", "endoflifeconsiderationsandmylastwishes": "No discussion on end of life considerations or last wishes occurred. When appropriate and sensitive, these topics should be introduced to respect client autonomy and preferences."}
abf62086-630a-4b4e-a5c9-26f8e0debd7e	849af6c2-7072-4c02-8384-2cdc0aad6b3a	John test	Global Template	2025-10-10 17:19:08.297436	2025-10-13 11:27:37.573	["Initiate six-week enablement care package immediately with two carers during morning, lunch, and evening.", "Conduct a comprehensive home environment safety and accessibility assessment.", "Coordinate care plan with Johnny’s wife and eldest daughter for continuity and involvement.", "Recruit and train Somali carers to meet Johnny’s cultural preference and care needs.", "Establish structured medication management with clear instructions for carers.", "Monitor and assess skin integrity daily to prevent pressure damage.", "Refer to dietitian for nutritional assessment and guidance tailored to Johnny’s preferences and medical condition.", "Plan and support safe outings to encourage social engagement and physical activity.", "Facilitate discussions about end-of-life care preferences with Johnny and family.", "Explore Johnny’s religious and spiritual needs to incorporate appropriate support.", "Implement communication strategies that consider Johnny’s multilingual abilities.", "Evaluate and document allergy status regularly.", "Discuss and install a key safe system for secure and timely care access."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"somali": "Johnny expressed a preference for Somali carers due to their gentle and caring demeanor. Culturally sensitive care respecting this preference is essential to enhance comfort, trust, and quality of care.", "hygiene": "Johnny requires daily help with personal hygiene, including washing and toileting. He uses a continent pad, indicating some level of continence but needs assistance with bathroom transitions and toileting routines. Personal hygiene support should include gentle, respectful care sensitive to his preferences.", "keysafe": "No information provided regarding key safe. It is recommended to discuss and implement a secure key safe arrangement to facilitate timely care access while ensuring home security.", "overview": "John Allen, known as Johnny, is a male patient diagnosed with lung cancer and mental health issues. He has significant care needs requiring daily assistance with personal hygiene, toileting, mobility, meal preparation, and social engagement. He lives with his wife and is supported by family members, including his eldest daughter. A six-week enablement package with twice two carers during morning, lunch, and evening times is recommended to address his complex needs promptly.\\n\\nFurther information on medication management, respiratory support, mental health monitoring, and communication preferences should be integrated into the overall care plan to ensure a holistic approach aligned with Johnny's complex needs.", "allergies": "No allergies were reported during the assessment. Ongoing review of allergy status is advised as part of routine care documentation.", "behaviour": "No challenging behaviours were reported during assessment. However, mental health issues may impact mood or behaviour; carers should be trained to recognize and respond empathetically to any psychological or emotional changes.", "breathing": "With a lung cancer diagnosis, breathing difficulties are probable. Carers should be trained to recognize respiratory distress, support breathing exercises if prescribed, and liaise closely with healthcare providers for symptom management.", "emotional": "Mental health issues are part of Johnny’s medical profile. Emotional support and psychological wellbeing are critical components of his care. Regular emotional health assessments and potential therapeutic interventions are recommended.", "nutrition": "Johnny’s nutritional preferences are known, but nutritional status must be monitored due to cancer and potential appetite changes. Dietitian referral may be beneficial for tailored nutritional advice supporting his condition.", "traveling": "Johnny requires assistance with going out, indicating mobility and support needs outside the home. Risk assessments and planning for safe outings should be part of his care plan to encourage social participation.", "background": "Johnny is a retired electrician with a long career including working for prominent companies like Excel. He has a strong social network with friends, three children, grandchildren, and a wife. This information is important for social engagement and emotional wellbeing strategies.", "actionitems": "Immediate initiation of a six-week enablement care package with two carers administered during key times of the day; conduct home safety and accessibility assessment; liaise with Johnny’s wife and family for continuity of care; provide culturally sensitive carers, preferably Somali as per Johnny’s preference; monitor mental health status regularly; support communication given multilingual abilities; develop a care plan including social stimulation aligned with Johnny’s interests.", "personalcare": "Johnny needs assistance with all aspects of personal care including washing, toileting, dressing, and mobility related to bathroom use. Two carers during key times indicate intensive support requirements. Care activities should maintain dignity, privacy and respond to his preferences.", "communication": "Johnny speaks five languages, including fluent German, Polish, and Czech, indicating strong communication skills and cultural adaptability. Care providers should be aware of his multilingualism and may consider language support or use preferred language for engagement and comfort.", "skinintegrity": "No explicit skin integrity issues were noted; however, given immobility and continence aid use, skin care monitoring is crucial to prevent pressure sores and infections. Daily skin assessments should be incorporated in the care routine.", "medicalhistory": "Johnny has lung cancer and mental health issues. The cancer diagnosis necessitates monitoring respiratory status, pain management, and symptom control. Mental health issues may require liaison with psychiatric or psychological services for ongoing support. Further medical details should be gathered for comprehensive care planning.", "homeenvironment": "Johnny lives with his wife in a family home. No environmental hazards were reported, but given his limited mobility and health status, a home environment assessment is recommended to ensure accessibility and safety. This may involve installing grab rails, ensuring clear walkways, and adequate lighting for nighttime toileting.", "eatinganddrinking": "Johnny’s meal preferences include breakfast with buttered toast and tea, and lunch of spaghetti with chicken and tap water. Nutritional needs should be monitored considering his illness; meal preparation support is required to ensure dietary intake aligns with preferences and health needs.", "medicationsupport": "Medication needs were not detailed, but given lung cancer and mental health issues, Johnny likely requires structured medication management. Carers should be trained and supported to assist with medication administration and monitoring for side effects.", "religionpracticing": "Religion was not mentioned during the assessment. It is advisable to explore Johnny’s religious beliefs and practices to integrate spiritual support within his care if relevant.", "interestsandhobbies": "Johnny enjoys watching television, with particular interest in Manchester United football. He practices swimming on Tuesdays, which contributes to his physical health and wellbeing. Encouraging continuation of these interests where possible is recommended.", "whoandwhatisimportanttome": "Johnny values his family—his wife, three children, especially his eldest daughter who was present during assessment—and his friends. He prefers carers of Somali origin due to cultural affinity and perceived gentleness. Maintaining these relationships and preferences is essential in his care plan.", "endoflifeconsiderationsandmylastwishes": "No explicit end-of-life wishes were stated during this assessment; however, given the lung cancer diagnosis, a sensitive discussion regarding advanced care planning is appropriate. This should involve Johnny and his family to ensure his wishes are respected."}
87778e68-6a96-4a83-a9db-778e0b8bc376	a86ad373-7390-4fe4-a757-48c1cad07b96	dfdfd	Global Template	2025-10-13 14:51:13.16093	2025-10-13 14:51:43.846	["Schedule a comprehensive face-to-face assessment to gather detailed information.", "Conduct a home safety and environment evaluation.", "Obtain and review full medical history including medications and allergies.", "Assess personal care and hygiene capabilities.", "Evaluate communication needs and potential aids.", "Identify key people and social supports important to the client.", "Review dietary habits and nutritional status.", "Discuss end of life care preferences and advance care planning.", "Arrange for key safe installation to ensure secure access.", "Plan regular skin integrity and respiratory status assessments.", "Implement emotional wellbeing screening and support referral.", "Develop a medication management and support plan based on assessment findings."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"hygiene": "No specific information was provided regarding the client’s hygiene practices. It is recommended to assess the client’s ability to maintain personal hygiene, including bathing, oral care, and grooming, to ensure dignity and health are maintained. Observations or client/caregiver feedback should be sought during follow-up.", "keysafe": "There is no information regarding key safe arrangements. Recommendations include establishing secure access to the property for emergency services or care providers as needed.", "overview": "The client’s statement '영원히' (meaning 'forever' in Korean) is brief and does not provide detailed information about their current needs or circumstances. A comprehensive assessment requires further dialogue to understand the client’s physical, emotional, and social care requirements. In the meantime, initial considerations should focus on potential ongoing support needs emphasizing continuity and long-term planning.", "allergies": "There is no record of allergies. Comprehensive medication and allergy checks must be performed to avoid adverse reactions.", "behaviour": "Behavioral patterns or concerns were not described. Observation and discussion during subsequent assessments should identify any issues such as mood, agitation, or cognitive impairment that might affect care.", "breathing": "There is no information regarding respiratory status. Screening for breathing difficulties or respiratory conditions is advised during medical evaluations.", "emotional": "Emotional wellbeing has not been addressed. Exploration of mood, mental health, and social support mechanisms is key to identifying needs for psychological support or counseling.", "nutrition": "Nutritional status is not detailed. A dietary assessment is essential to ensure balanced intake and to identify the need for supplements or specialist referrals.", "background": "The background of the client, including cultural, social, and familial context, is not available. Gathering this information will be essential to personalize care and respect client preferences.", "actionitems": "Immediate action involves arranging a comprehensive face-to-face assessment to collect detailed information. Follow-up actions should include safety checks, evaluating support networks, and reviewing medical needs as identified. Ongoing monitoring and reassessment plans should be established.", "personalcare": "Insufficient information on personal care abilities was provided. Assessment should determine the client’s independence levels in dressing, toileting, and mobility to tailor support appropriately.", "communication": "Communication abilities are not stated. Assessment to evaluate language, hearing, vision, and cognitive communication skills is necessary to ensure information is accessible and support is appropriate.", "skinintegrity": "Skin condition is unknown. Regular skin assessments should be implemented, especially if mobility is compromised, to prevent pressure ulcers or infections.", "medicalhistory": "No medical history was disclosed. It is important to obtain detailed medical records, including any chronic conditions, medications, allergies, and recent hospitalizations, to inform care planning and risk management.", "homeenvironment": "There is no data on the client’s living conditions or safety at home. An assessment should be conducted to evaluate the safety, accessibility, and suitability of the home environment, including potential hazards and adaptations required for mobility or sensory needs.", "eatinganddrinking": "Information about the client’s eating and drinking habits or swallowing difficulties is lacking. Nutritional assessments, hydration status checks, and potential dietary modifications should be undertaken.", "medicationsupport": "No details on medication management were provided. A medication review should be conducted to assess adherence, side effects, and the need for support in administration.", "religionpracticing": "Religious beliefs or practices were not disclosed. Understanding and respecting spiritual needs can aid holistic care planning.", "interestsandhobbies": "No details were given about interests or hobbies. Understanding client preferences can improve engagement and quality of life by incorporating meaningful activities.", "whoandwhatisimportanttome": "Client’s relationships and important people are unknown. Identifying key individuals in the client’s life can support social wellbeing and inform care decisions.", "endoflifeconsiderationsandmylastwishes": "No end of life preferences or advance directives have been documented. Early discussions about wishes and advance care planning are recommended to uphold client autonomy."}
28f33b31-8f59-4efe-a797-fbe89df4e581	4f2812ad-0e00-47bb-b864-806f01aeab69	Test 2	Global Template	2025-10-14 09:10:16.459589	2025-10-14 09:10:42.405	["Conduct a full care needs assessment covering all domains.", "Arrange a home visit to evaluate the home environment and safety.", "Obtain detailed medical history and current medication list.", "Assess personal care abilities and offer support or equipment as needed.", "Identify key relationships and social support systems.", "Explore interests and hobbies to support engagement.", "Review communication needs and provide aides if necessary.", "Evaluate nutritional needs including eating and drinking capabilities.", "Check for allergies and document accordingly.", "Discuss and document end-of-life wishes sensitively where appropriate.", "Assess skin integrity and respiratory function.", "Plan emotional wellbeing support and mental health assessment.", "Confirm keysafe arrangements for care provider access."]	\N	\N	\N	\N	completed	1c19f710-3aac-46ad-b89d-d22c45fae9e3	assigned	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	\N	\N	\N	\N	{"hygiene": "No specific information was provided regarding Andrea's hygiene. It is recommended to assess Andrea's ability to maintain personal hygiene independently and identify any needs for assistance or adaptive equipment to ensure adequate self-care.", "keysafe": "No information about key safe usage or arrangements was noted. Assess whether Andrea has a key safe or requires one to facilitate safe access for care providers, ensuring security and ease of support delivery.", "overview": "Due to the limited information from the transcript, a comprehensive overview cannot be fully established. However, an initial assessment suggests that the individual, Andrea, was engaged in a positive and cooperative manner during the initial contact. It is recommended to conduct a more in-depth assessment to gather detailed information across all relevant domains to inform appropriate care planning and support needs.", "allergies": "No allergy information was provided. Confirming any known allergies or adverse reactions to medications, foods, or environmental factors is essential for safe care management.", "behaviour": "Behavioral observations were limited to a brief positive interaction. There is no indication of concerns or difficulties. Ongoing observation and further inquiry will be necessary to determine behavioral support needs.", "breathing": "Breathing status was not addressed. It is important to assess respiratory function, any existing conditions such as asthma or COPD, and need for respiratory support.", "emotional": "Emotional wellbeing was not explored in the transcript. A comprehensive assessment should consider mood, mental health, stressors, and access to emotional support to inform appropriate interventions.", "nutrition": "Nutritional status was not discussed. Assessing weight, dietary intake, appetite, and any risk of malnutrition is vital to ensuring adequate nutrition and hydration.", "background": "No background information was provided. It is recommended to explore Andrea's personal history, cultural background, social circumstances, and support network to provide person-centered care.", "actionitems": "Further information gathering is required. Suggested next steps include comprehensive assessment in each care domain, building rapport, and identifying needs or risks.", "personalcare": "Personal care abilities were not discussed. An assessment should be conducted to evaluate Andrea's capacity to manage dressing, bathing, toileting, and other activities of daily living, and to identify any required support.", "communication": "Communication was functional in the brief exchange, with Andrea responding appropriately. A more detailed assessment should be done to identify any communication difficulties and necessary support strategies or aids.", "skinintegrity": "No data was given regarding skin integrity. An assessment should be made to identify any risk factors such as immobility or incontinence that could affect skin health and require preventive measures.", "medicalhistory": "No medical history was disclosed in the provided transcript. It is essential to obtain a detailed medical history including current diagnoses, treatments, and any recent hospitalizations to inform care planning.", "homeenvironment": "Details about Andrea's home environment are not available. A home visit should be arranged to assess safety, accessibility, and suitability of the living environment to support Andrea's wellbeing and independence.", "eatinganddrinking": "Eating and drinking needs were not discussed. It is important to assess dietary requirements, preferences, swallowing difficulties, and nutritional status for informed care and support.", "medicationsupport": "No medication information was obtained. A medication review should be conducted to identify current prescriptions, adherence levels, and the need for support with administration or monitoring.", "religionpracticing": "There was no mention of religious beliefs or practices. Understanding Andrea's religion or spiritual needs can be important for culturally sensitive care and respecting personal values.", "interestsandhobbies": "No details were shared regarding Andrea's interests or hobbies. Understanding these areas will aid in promoting engagement, wellbeing, and social inclusion.", "whoandwhatisimportanttome": "No information available on significant relationships or support networks. The assessment should identify family members, friends, or others important to Andrea to involve them appropriately in care planning.", "endoflifeconsiderationsandmylastwishes": "There were no discussions related to end-of-life wishes. Sensitive exploration of these topics at an appropriate time is recommended to respect Andrea's preferences and inform advanced care planning if applicable."}
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cases (id, client_name, created_at, updated_at, status, address, case_details, assigned_to, assigned_at, created_by) FROM stdin;
95d2eda4-2533-4790-9b74-b35b601205c8	Tesh	2025-10-09 13:50:44.837	2025-10-09 13:50:44.837	assigned	\N	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	2025-10-09 13:50:44.837	1c19f710-3aac-46ad-b89d-d22c45fae9e3
849af6c2-7072-4c02-8384-2cdc0aad6b3a	Test 4	2025-10-10 17:15:08.797	2025-10-10 18:18:46.358	assigned	122 high road, Tottenham N17 	\N	0a60fc42-e0dd-43af-8382-08e6d331953e	2025-10-10 18:18:46.358	1c19f710-3aac-46ad-b89d-d22c45fae9e3
4f2812ad-0e00-47bb-b864-806f01aeab69	Test 2	2025-10-14 09:09:43.939	2025-10-14 09:09:43.939	assigned	\N	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	2025-10-14 09:09:43.939	1c19f710-3aac-46ad-b89d-d22c45fae9e3
a86ad373-7390-4fe4-a757-48c1cad07b96	Kathleen Johnston 	2025-10-01 10:10:44.948	2025-10-01 10:10:44.948	assigned	\N	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	2025-10-01 10:10:44.948	1c19f710-3aac-46ad-b89d-d22c45fae9e3
4bbaf74b-bc38-4b57-b499-5bda064832d0	Kevin Jones	2025-10-01 15:06:17.538	2025-10-01 15:06:17.538	assigned	\N	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	2025-10-01 15:06:17.538	1c19f710-3aac-46ad-b89d-d22c45fae9e3
a2f2b60d-334a-4727-ba0f-b1f68bda8422	Aronasoft	2025-10-15 09:39:22.527	2025-10-15 09:39:31.488	assigned	\N	\N	041eb4bd-ee5d-4524-8628-26995f704ecf	2025-10-15 09:39:31.488	5eec93b6-d353-478f-b590-9ceddb4ae487
af15f773-2f7e-4b56-bff5-9bf31f26edf0	Team Meeting 	2025-10-15 13:20:14.699	2025-10-15 13:20:14.699	assigned	\N	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	2025-10-15 13:20:14.699	1c19f710-3aac-46ad-b89d-d22c45fae9e3
41ff32c6-e190-44cb-bf50-431459024161	Mobile testing 	2025-10-15 14:17:45.074	2025-10-15 14:17:45.074	assigned	\N	\N	1c19f710-3aac-46ad-b89d-d22c45fae9e3	2025-10-15 14:17:45.074	1c19f710-3aac-46ad-b89d-d22c45fae9e3
\.


--
-- Data for Name: recordings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.recordings (id, assessment_id, file_name, file_path, duration, created_at, processing_status, updated_at) FROM stdin;
616e7369-77c8-4509-bc79-fa1890273994	2fe4a34c-7e13-4b43-aac9-1698a92625db	recording-1760086994877.webm	uploads/1760086995314-537372609.webm	\N	2025-10-10 09:03:15.446014	completed	2025-10-10 09:03:15.446014
1b3940a9-6abe-49a2-a482-683c76f2a92d	28f33b31-8f59-4efe-a797-fbe89df4e581	recording-1760433015883.webm	uploads/1760433016392-569758430.webm	\N	2025-10-14 09:10:16.514139	completed	2025-10-14 09:10:16.514139
15248c9c-b71f-492d-b21e-b1b976813455	abf62086-630a-4b4e-a5c9-26f8e0debd7e	recording-1760116744880.webm	uploads/1760116748200-449345461.webm	\N	2025-10-10 17:19:08.391887	completed	2025-10-10 17:19:08.391887
14e90843-ef87-4b17-94b1-93909a6f5e29	d062f1e8-37e7-46b9-b456-4ff752bcba52	recording-1760017894930.webm	uploads/1760017895649-851955436.webm	\N	2025-10-09 13:51:35.781309	completed	2025-10-09 13:51:35.781309
502d5cc6-2f30-4efb-a33d-124cfa88e141	87778e68-6a96-4a83-a9db-778e0b8bc376	recording-1760367073090.webm	uploads/1760367073092-192605114.webm	\N	2025-10-13 14:51:13.223159	completed	2025-10-13 14:51:13.223159
270c6da9-07c3-4aef-a5ed-abb4e281655a	e0110fa9-12ca-4630-b451-d4848af43020	recording-1760537785947.m4a	uploads/1760537786610-977304834.m4a	\N	2025-10-15 14:16:26.747637	completed	2025-10-15 14:16:26.747637
620a8a5c-8b4c-4c1d-87e4-a529f5a4b5a4	1c58bc1c-514b-460e-ad77-9da3466574a0	recording-1760538759197.m4a	uploads/1760538759882-361797082.m4a	\N	2025-10-15 14:32:40.011093	completed	2025-10-15 14:32:40.011093
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.templates (id, name, description, sections, status, created_by, created_at, updated_at, priority) FROM stdin;
dea87866-5aeb-4bec-bebd-6bd5fe004826	Global Template	Standard Assessment 	["Overview", "Action Items", "Meeting"]	active	5eec93b6-d353-478f-b590-9ceddb4ae487	2025-09-26 09:59:32.052668	2025-10-15 13:38:03.936	standard
\.


--
-- Data for Name: transcripts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.transcripts (id, case_id, recording_id, raw_transcript, enhanced_transcript, processing_status, created_at, updated_at, assessment_id) FROM stdin;
517a212d-e71d-483f-8796-b8506970a9cc	41ff32c6-e190-44cb-bf50-431459024161	620a8a5c-8b4c-4c1d-87e4-a529f5a4b5a4	I was having a conversation with her. She's from two different countries.	{"text": "I was having a conversation with her. She's from two different countries.", "segments": [{"end": 3.700000047683716, "text": "I was having a conversation with her. She's from two different countries.", "start": 0, "speaker": "Client", "speakerRole": "Client"}], "speakers": ["Client"], "speakerRoles": {"Client": "Client"}, "conversationFormat": "Client: \\"I was having a conversation with her. She's from two different countries.\\""}	transcription_complete	2025-10-15 14:32:46.455573	2025-10-15 14:32:47.698	1c58bc1c-514b-460e-ad77-9da3466574a0
4eda402f-fd7a-42ba-b9ad-e39332050431	af15f773-2f7e-4b56-bff5-9bf31f26edf0	270c6da9-07c3-4aef-a5ed-abb4e281655a	Let's say, as you did not attend today's meeting...	{"text": "Let's say, as you did not attend today's meeting...", "segments": [{"end": 2.380000114440918, "text": "Let's say, as you did not attend today's meeting...", "start": 0, "speaker": "Social Worker", "speakerRole": "Social Worker"}], "speakers": ["Social Worker"], "speakerRoles": {"Social Worker": "Social Worker"}, "conversationFormat": "Social Worker: \\"Let's say, as you did not attend today's meeting...\\""}	transcription_complete	2025-10-15 14:16:36.155727	2025-10-15 14:16:37.946	e0110fa9-12ca-4630-b451-d4848af43020
1cc92937-3b7f-4649-8b41-198301119398	95d2eda4-2533-4790-9b74-b35b601205c8	14e90843-ef87-4b17-94b1-93909a6f5e29	Hi everyone, this is Tess. I like to do assessment on Client A and he likes to eat some food, you know, the rest is history.	{"text": "Hi everyone, this is Tess. I like to do assessment on Client A and he likes to eat some food, you know, the rest is history.", "segments": [{"end": 4.340000152587891, "text": "Hi everyone, this is Tess.", "start": 1.9800000190734863, "speaker": "Tess", "speakerRole": "Social Worker"}, {"end": 12.319999694824219, "text": "I like to do assessment on Client A and he likes to eat some food, you know, the rest is history.", "start": 4.679999828338623, "speaker": "Client", "speakerRole": "Client"}], "speakers": ["Tess", "Client"], "speakerRoles": {"Tess": "Social Worker", "Client": "Client"}, "conversationFormat": "Tess: \\"Hi everyone, this is Tess. I like to do assessment on Client A.\\"\\n\\nClient: \\"He likes to eat some food.\\"\\n\\nTess: \\"You know, the rest is history.\\""}	transcription_complete	2025-10-09 13:51:43.363644	2025-10-09 13:51:45.704	d062f1e8-37e7-46b9-b456-4ff752bcba52
b1a15fee-6d75-4ceb-a375-828809c0a2ac	95d2eda4-2533-4790-9b74-b35b601205c8	616e7369-77c8-4509-bc79-fa1890273994	Oh	{"text": "Oh", "segments": [{"end": 1.8600000143051147, "text": "Oh", "start": 0, "speaker": "Client", "speakerRole": "Client"}], "speakers": ["Client"], "speakerRoles": {"Client": "Client"}, "conversationFormat": "Client: \\"Oh\\""}	transcription_complete	2025-10-10 09:03:22.648352	2025-10-10 09:03:22.959	2fe4a34c-7e13-4b43-aac9-1698a92625db
74ff6e24-c237-43c6-b87a-245958c0f996	849af6c2-7072-4c02-8384-2cdc0aad6b3a	15248c9c-b71f-492d-b21e-b1b976813455	Good afternoon, this is, I'm doing an assessment for John Allen. John Allen lives with his wife. He's been diagnosed with diseases, lung cancer and mental health. John requires daily help with his hygiene and he needs help with food. He needs help with washing and he needs help with going out. John requires extra assistance when he's getting up every day to go to the bathroom, toileting. John wears a continent pad and also John likes to watch TV. John's background. John's background was mechanic and he worked as a mechanic for his entire life. John has a lot of friends. John has three children and a wife. He has grandchildren. John, his background, he worked as an electrician in his entire life and he worked for major companies like the Excel company. John's assessment today, he requires two carers in the morning, two carers at lunch and two carers at p.m. John requires extra help with everything he needs and John would prefer a Somali carers because they're very gentle and very caring. John speaks five languages, one of them being fluent German, Polish and Czech Republic. Today in here, John's wife is sitting here and his old eldest daughter, Catherine. John would prefer to be called Johnny. His favorite team is Manchester United but all his children, they support Chelsea. He grew up in Chelsea. John would like us to start the care package as soon as possible, even today, this evening. This is a six weeks enablement for John to get help with his needs and John likes to go swimming on Tuesdays with activities he enjoys. This is the end of the assessment. John likes breakfast in the morning, toast, cup of tea and with butter with toast. Lunch, he likes spaghetti with chicken and with tap water.	{"text": "Good afternoon, this is, I'm doing an assessment for John Allen. John Allen lives with his wife. He's been diagnosed with diseases, lung cancer and mental health. John requires daily help with his hygiene and he needs help with food. He needs help with washing and he needs help with going out. John requires extra assistance when he's getting up every day to go to the bathroom, toileting. John wears a continent pad and also John likes to watch TV. John's background. John's background was mechanic and he worked as a mechanic for his entire life. John has a lot of friends. John has three children and a wife. He has grandchildren. John, his background, he worked as an electrician in his entire life and he worked for major companies like the Excel company. John's assessment today, he requires two carers in the morning, two carers at lunch and two carers at p.m. John requires extra help with everything he needs and John would prefer a Somali carers because they're very gentle and very caring. John speaks five languages, one of them being fluent German, Polish and Czech Republic. Today in here, John's wife is sitting here and his old eldest daughter, Catherine. John would prefer to be called Johnny. His favorite team is Manchester United but all his children, they support Chelsea. He grew up in Chelsea. John would like us to start the care package as soon as possible, even today, this evening. This is a six weeks enablement for John to get help with his needs and John likes to go swimming on Tuesdays with activities he enjoys. This is the end of the assessment. John likes breakfast in the morning, toast, cup of tea and with butter with toast. Lunch, he likes spaghetti with chicken and with tap water.", "segments": [{"end": 4.860000133514404, "text": "Good afternoon, this is, I'm doing an assessment for John Allen.", "start": 2.5199999809265137, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 12.860000133514404, "text": "John Allen lives with his wife. He's been diagnosed with diseases, lung cancer and mental health.", "start": 4.860000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 19.360000133514404, "text": "John requires daily help with his hygiene and he needs help with food.", "start": 12.860000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 25.360000133514404, "text": "He needs help with washing and he needs help with going out.", "start": 19.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 33.360000133514404, "text": "John requires extra assistance when he's getting up every day to go to the bathroom, toileting.", "start": 25.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 39.360000133514404, "text": "John wears a continent pad and also John likes to watch TV.", "start": 33.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 47.360000133514404, "text": "John's background. John's background was mechanic and he worked as a mechanic for his entire life.", "start": 39.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 50.360000133514404, "text": "John has a lot of friends.", "start": 47.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 53.860000133514404, "text": "John has three children and a wife.", "start": 50.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 55.360000133514404, "text": "He has grandchildren.", "start": 53.860000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 66.3600001335144, "text": "John, his background, he worked as an electrician in his entire life and he worked for major companies like the Excel company.", "start": 55.360000133514404, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 75.8600001335144, "text": "John's assessment today, he requires two carers in the morning, two carers at lunch and two carers at p.m.", "start": 66.3600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 86.8600001335144, "text": "John requires extra help with everything he needs and John would prefer a Somali carers because they're very gentle and very caring.", "start": 75.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 93.8600001335144, "text": "John speaks five languages, one of them being fluent German, Polish and Czech Republic.", "start": 86.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 100.8600001335144, "text": "Today in here, John's wife is sitting here and his old eldest daughter, Catherine.", "start": 93.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 104.3600001335144, "text": "John would prefer to be called Johnny.", "start": 100.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 110.8600001335144, "text": "His favorite team is Manchester United but all his children, they support Chelsea.", "start": 104.3600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 113.3600001335144, "text": "He grew up in Chelsea.", "start": 110.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 121.8600001335144, "text": "John would like us to start the care package as soon as possible, even today, this evening.", "start": 113.3600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 134.8600001335144, "text": "This is a six weeks enablement for John to get help with his needs and John likes to go swimming on Tuesdays with activities he enjoys.", "start": 121.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 138.3600001335144, "text": "This is the end of the assessment.", "start": 134.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 145.8600001335144, "text": "John likes breakfast in the morning, toast, cup of tea and with butter with toast.", "start": 138.3600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 150.8600001335144, "text": "Lunch, he likes spaghetti with chicken and with tap water.", "start": 145.8600001335144, "speaker": "Social Worker", "speakerRole": "Social Worker"}], "speakers": ["Social Worker"], "speakerRoles": {"Social Worker": "Social Worker"}, "conversationFormat": "Social Worker: \\"Good afternoon, I’m doing an assessment for John Allen. John lives with his wife and he’s been diagnosed with lung cancer and mental health issues. He requires daily help with his hygiene, including assistance with washing, food preparation, and going out. John also needs extra help getting up every day to go to the bathroom and with toileting. He wears a continent pad.\\"\\n\\nSocial Worker: \\"John likes to watch TV. Regarding his background, John worked as a mechanic for his entire life. He has a lot of friends, three children, a wife, and grandchildren.\\"\\n\\nSocial Worker: \\"Actually, correction—John worked as an electrician his entire life and was employed by major companies like the Excel company.\\"\\n\\nSocial Worker: \\"For today’s assessment, John requires two carers in the morning, two carers at lunch, and two carers in the evening. He needs extra help with everything. John would prefer Somali carers because they are very gentle and caring.\\"\\n\\nSocial Worker: \\"John speaks five languages, including fluent German, Polish, and Czech. Today, John's wife and his eldest daughter, Catherine, are here with us.\\"\\n\\nSocial Worker: \\"John prefers to be called Johnny. His favorite team is Manchester United, although all his children support Chelsea. He grew up in Chelsea.\\"\\n\\nSocial Worker: \\"Johnny would like us to start the care package as soon as possible, even this evening. This is a six-week enablement package to help with his needs. He enjoys activities like swimming on Tuesdays.\\"\\n\\nSocial Worker: \\"Lastly, regarding his meals, Johnny likes breakfast with toast and a cup of tea, butter on the toast. For lunch, he prefers spaghetti with chicken and tap water.\\"\\n\\nSocial Worker: \\"That concludes the assessment.\\""}	transcription_complete	2025-10-10 17:19:55.161046	2025-10-10 17:20:06.244	abf62086-630a-4b4e-a5c9-26f8e0debd7e
937f7ea9-45cb-4baf-a07a-4ed029fe9cb8	a86ad373-7390-4fe4-a757-48c1cad07b96	502d5cc6-2f30-4efb-a33d-124cfa88e141	영원히	{"text": "영원히", "segments": [{"end": 0.699999988079071, "text": "영원히", "start": 0, "speaker": "Client", "speakerRole": "Client"}], "speakers": ["Client"], "speakerRoles": {"Client": "Client"}, "conversationFormat": "Client: \\"영원히\\""}	transcription_complete	2025-10-13 14:51:20.660874	2025-10-13 14:51:22.346	87778e68-6a96-4a83-a9db-778e0b8bc376
80ba8b82-5e01-405e-8ed0-f9b82427668e	4f2812ad-0e00-47bb-b864-806f01aeab69	1b3940a9-6abe-49a2-a482-683c76f2a92d	Thank you very much. Thank you.   Hi, Andrea. Good morning. You OK? Yeah, you? Yeah. Yeah. Yeah, I'm good.	{"text": "Thank you very much. Thank you.   Hi, Andrea. Good morning. You OK? Yeah, you? Yeah. Yeah. Yeah, I'm good.", "segments": [{"end": 1.940000057220459, "text": "Thank you very much. Thank you.", "start": 0, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 9.239999771118164, "text": "Hi, Andrea. Good morning. You OK?", "start": 6.239999771118164, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 8.300000190734863, "text": "Yeah, you?", "start": 7.920000076293945, "speaker": "Andrea", "speakerRole": "Client"}, {"end": 9.699999809265137, "text": "Yeah. Yeah.", "start": 8.65999984741211, "speaker": "Social Worker", "speakerRole": "Social Worker"}, {"end": 10.15999984741211, "text": "Yeah, I'm good.", "start": 9.699999809265137, "speaker": "Andrea", "speakerRole": "Client"}], "speakers": ["Social Worker", "Andrea"], "speakerRoles": {"Andrea": "Client", "Social Worker": "Social Worker"}, "conversationFormat": "Social Worker: \\"Thank you very much. Thank you.\\"\\n\\nSocial Worker: \\"Hi, Andrea. Good morning. You OK?\\"\\n\\nAndrea: \\"Yeah, you?\\"\\n\\nSocial Worker: \\"Yeah. Yeah. Yeah, I'm good.\\""}	transcription_complete	2025-10-14 09:10:23.524313	2025-10-14 09:10:25.406	28f33b31-8f59-4efe-a797-fbe89df4e581
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, email, password, role, invitation_token, invitation_status, invited_at, invited_by, first_name, last_name, is_active, created_at, updated_at, password_reset_token, password_reset_expires) FROM stdin;
5eec93b6-d353-478f-b590-9ceddb4ae487	admin@audionotesai.com	admin@audionotesai.com	bb46c60b94758d1062d9234b2cc4b4b3bd1ebb79b4049f8cb12891922dad193d44a93ecfd304d519b067451f253532221e9b0a9ca518c9e2603b5c788779bd86.34323a3c5f2d68d6ad31e9ca5d8374bbaeb57e1e059818ae7ec31bdddabc2432	admin	\N	accepted	\N	\N	System	Administrator	1	2025-09-16 12:22:32.715923	2025-09-16 12:22:32.715923	\N	\N
0a60fc42-e0dd-43af-8382-08e6d331953e	localk	\N	daffc74e008cf65c6214449a918126f77ce192ed36cf47d2557fc299e16f45af56e25503ae14b57c630bec3f8a59d03e429f4b42250151dab4dcf95a844f8e89.7f29dcd2aa09f7779dd0f9a2abfe5fc9	team_member	\N	accepted	2025-09-19 12:00:09.02	5eec93b6-d353-478f-b590-9ceddb4ae487	local	k	1	2025-09-19 12:00:09.02	2025-09-19 12:00:09.02	\N	\N
799c6848-8055-4a1b-802c-7ef0ecabaa2b	sudhirkundal	\N	c9929d6665f62485a848791b77186813a342f404bd069b3cafd04785e8d542b6f9ab53c88e86b925ee128408fbf1ba308cc2826462aab054aa89241198642089.bf61e4930f5576e4a279ea5e43538838	team_member	\N	accepted	2025-09-24 12:41:29.273	5eec93b6-d353-478f-b590-9ceddb4ae487	Sudhir	kundal	1	2025-09-24 12:41:29.273	2025-09-27 10:06:19.182	\N	\N
1c19f710-3aac-46ad-b89d-d22c45fae9e3	woodberry	\N	5db71e742f6b7bd460144f6151031e8d26135160283fe1b4d8e9c31d8676d55613c5ecd8e3957e91e2ca3393d7414987379223a2dc178cd22aee9108c0b59142.07ac3f5fd9692cc841ab218129527e9e	team_member	\N	accepted	2025-09-30 12:23:45.609	5eec93b6-d353-478f-b590-9ceddb4ae487	woodberry	Care	1	2025-09-30 12:23:45.609	2025-09-30 12:23:45.609	\N	\N
041eb4bd-ee5d-4524-8628-26995f704ecf	developer0945@gmail.com	developer0945@gmail.com	8dd86b533603a55162112afc870d5934061ded976ffa1d56e17420363e20356bbb0a6e7d9179dd53131162edcaed4d3aff92ecda2a4242d26331087d0ddbdf38.068403e556fff8062731f273e4a31ae5	team_member	\N	accepted	2025-10-14 09:49:25.443	5eec93b6-d353-478f-b590-9ceddb4ae487	Test	User	1	2025-10-14 09:49:25.481113	2025-10-14 09:52:07.512	\N	\N
\.


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: recordings recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recordings
    ADD CONSTRAINT recordings_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: transcripts transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: assessments assessments_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: assessments assessments_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: assessments assessments_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: cases cases_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: cases cases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: recordings recordings_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recordings
    ADD CONSTRAINT recordings_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: templates templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: transcripts transcripts_assessment_id_assessments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_assessment_id_assessments_id_fk FOREIGN KEY (assessment_id) REFERENCES public.assessments(id);


--
-- Name: transcripts transcripts_case_id_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_case_id_cases_id_fk FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: transcripts transcripts_recording_id_recordings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_recording_id_recordings_id_fk FOREIGN KEY (recording_id) REFERENCES public.recordings(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

