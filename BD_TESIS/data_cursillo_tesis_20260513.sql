SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 1cyv43yND99M5FglkzZWp1vrP8TNHZFUiuoZFOnFEwWU9y4AYiYVvHulYwbsBox

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	8036059d-6a24-4137-8619-b35965eedac8	authenticated	authenticated	kamiladiaz.2dario@gmail.com	$2a$10$M8YmNqF4pn/HAbGDJWma9.xGytbfRVc4cSUS6sNt2Hr2K9RrD/yMe	2026-05-03 19:52:02.184708+00	\N		\N		\N			\N	2026-05-10 01:09:10.739115+00	{"provider": "email", "providers": ["email"]}	{"sub": "8036059d-6a24-4137-8619-b35965eedac8", "email": "kamiladiaz.2dario@gmail.com", "nombres": "Mabel", "apellidos": "Escurra", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2026-05-03 19:52:02.125116+00	2026-05-10 01:09:10.769906+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	d4509b87-cdd5-4603-8324-e184da1a3290	authenticated	authenticated	2@gmail.com	$2a$10$rTu3hTexrfuNXnYauQ2zTO1wzI0rd4KFyHW6bacpl3bR.Z3MNXg96	2025-12-20 02:49:48.952408+00	\N		\N		\N			\N	2025-12-20 02:49:48.962086+00	{"provider": "email", "providers": ["email"]}	{"sub": "d4509b87-cdd5-4603-8324-e184da1a3290", "email": "2@gmail.com", "nombres": "juanito", "apellidos": "torres", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2025-12-20 02:49:48.856968+00	2025-12-20 02:49:48.975247+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	55b10fa7-a5b8-4536-94be-c3dd9de3d326	authenticated	authenticated	1@gmial.com	$2a$10$TiK6A3Hp4MzKy115BvXOU.eDJzPHOjr5SlV0lImDI9DtBDLRPAHdW	2025-12-18 05:31:46.049215+00	\N		\N		\N			\N	2026-02-19 04:19:28.680284+00	{"provider": "email", "providers": ["email"]}	{"sub": "55b10fa7-a5b8-4536-94be-c3dd9de3d326", "email": "1@gmial.com", "nombres": "pepe", "apellidos": "lopez", "email_verified": true, "phone_verified": false}	\N	2025-12-18 05:31:46.015612+00	2026-02-19 17:46:35.381461+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	d2841cfb-ec63-4798-8a66-cbfc9d201439	authenticated	authenticated	realmepy@gmail.com	$2a$10$DWmrGgPGOzPjZTiNp./5ReOVAQxn5iFgfvqQaL/kzMw3WBJrR5j2e	2026-01-12 02:59:12.794956+00	\N		\N		\N			\N	2026-03-23 01:43:00.49335+00	{"provider": "email", "providers": ["email"]}	{"sub": "d2841cfb-ec63-4798-8a66-cbfc9d201439", "email": "realmepy@gmail.com", "nombres": "Estudioso", "apellidos": "lopez", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2026-01-12 02:59:12.739083+00	2026-03-23 01:43:00.496787+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	authenticated	authenticated	o.munoz.castro@gmail.com	$2a$10$oXYWmQg7IqV6JRoxcgvOjOjbdSwcv8qcaCnc4FIuZoPmroIC0ii3.	2025-12-18 04:48:53.239194+00	\N		\N		\N			\N	2026-05-13 03:05:42.253502+00	{"provider": "email", "providers": ["email"]}	{"sub": "9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2", "email": "o.munoz.castro@gmail.com", "email_verified": true, "phone_verified": false}	\N	2025-12-18 04:48:53.212052+00	2026-05-13 04:44:57.94734+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	de5d085a-de9b-4c32-aa28-fb2d95466fb8	authenticated	authenticated	diazekmila@fpuna.edu.py	$2a$10$grarGMa7L6aXoeV.LSMyweLEdMGw7x0/WCbD..07/dsA8B.Nm1AJS	2026-05-10 05:19:47.238565+00	\N		\N		\N			\N	2026-05-10 05:19:47.249453+00	{"provider": "email", "providers": ["email"]}	{"sub": "de5d085a-de9b-4c32-aa28-fb2d95466fb8", "email": "diazekmila@fpuna.edu.py", "nombres": "Maria", "apellidos": "Benitez", "id_cursillo": "04cbfec5-497a-480d-ba4d-1a08c982edb7", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2026-05-10 05:19:47.096725+00	2026-05-10 05:19:47.28183+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	31c2ebbb-ee74-449f-88b3-c6d250604a44	authenticated	authenticated	oscardmunozc@fpuna.edu.py	$2a$10$5RZ3mrX7Sx1cmUGqaAShPuDSjleWDq92I5cDOeczJez4yQflGTbni	2026-03-15 22:23:59.518285+00	\N		\N		\N			\N	2026-05-12 23:28:23.829122+00	{"provider": "email", "providers": ["email"]}	{"sub": "31c2ebbb-ee74-449f-88b3-c6d250604a44", "email": "oscardmunozc@fpuna.edu.py", "nombres": "Daniel", "apellidos": "Muñoz", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2026-03-15 22:23:59.3592+00	2026-05-12 23:28:23.862304+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	f7e04a5c-ec80-457d-995c-137d8fad9cc9	authenticated	authenticated	oscardmunozc@gmail.com	$2a$10$sem8J5qbpimLP3dzArl0yeqMc1MgcedyPhLW2upgPjhTvx5MmEb8C	2025-12-18 01:40:41.091436+00	\N		\N		\N			\N	2026-05-13 03:00:41.34417+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2025-12-18 01:40:41.029355+00	2026-05-13 03:00:41.53915+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	f89f8bdb-30e6-4988-9e98-7fa7b125ba7a	authenticated	authenticated	olakasedanielxd@gmail.com	$2a$10$EjTQprbemeO6VwX4/uFNs.1CGDYvaQc22DMepMEGtDzmpVZtJmSY.	2026-01-04 05:01:11.471317+00	\N		\N		\N			\N	2026-05-03 19:51:51.560513+00	{"provider": "email", "providers": ["email"]}	{"sub": "f89f8bdb-30e6-4988-9e98-7fa7b125ba7a", "email": "olakasedanielxd@gmail.com", "nombres": "Daniel", "apellidos": "Munoz", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2026-01-04 05:01:11.305177+00	2026-05-03 19:51:51.576178+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	authenticated	authenticated	escurrablanca410@gmail.com	$2a$10$iXooN5vm1eTYNxth3yoKD.xhgpdgT.T20vv9t1FwwcpdZxWJIHm8q	2026-04-26 16:22:02.035916+00	\N		\N		\N			\N	2026-05-10 23:52:56.805477+00	{"provider": "email", "providers": ["email"]}	{"sub": "c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe", "email": "escurrablanca410@gmail.com", "nombres": "Blanca", "apellidos": "Escurra", "tipo_registro": "DOCENTE", "email_verified": true, "phone_verified": false}	\N	2026-04-26 16:22:01.7464+00	2026-05-11 02:14:13.088378+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	79a0830b-145c-4e91-a21e-dcccb3bbdc21	authenticated	authenticated	diazekmila@gmail.com	$2a$10$h9UBpU9Nj6Q9ZaWuj4bOReuxO5JKj0C9WVPqhIvvbMjwIpoZw/rGe	2026-04-26 16:01:08.519163+00	\N		\N		\N			\N	2026-05-10 23:21:07.221354+00	{"provider": "email", "providers": ["email"]}	{"sub": "79a0830b-145c-4e91-a21e-dcccb3bbdc21", "email": "diazekmila@gmail.com", "nombres": "Kamila", "apellidos": "Diaz", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false}	\N	2026-04-26 16:01:08.21464+00	2026-05-10 23:21:07.246059+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	06debd03-598d-4b4f-bc37-0f5401f34f3f	authenticated	authenticated	gladysnative1@gmail.com	$2a$10$YB7eWZT6XZf37iJ4FYWwcOmX/589avcRuu822wUcCgIGRrzdY443O	2026-05-12 20:58:29.532954+00	\N		\N		\N			\N	2026-05-12 20:58:29.555396+00	{"provider": "email", "providers": ["email"]}	{"sub": "06debd03-598d-4b4f-bc37-0f5401f34f3f", "email": "gladysnative1@gmail.com", "nombres": "Gladys", "telefono": "0981123333", "apellidos": "N", "id_cursillo": "04cbfec5-497a-480d-ba4d-1a08c982edb7", "tipo_registro": "ESTUDIANTE", "email_verified": true, "phone_verified": false, "telefono_visible": true}	\N	2026-05-12 20:58:29.3452+00	2026-05-13 03:58:22.215472+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
f7e04a5c-ec80-457d-995c-137d8fad9cc9	f7e04a5c-ec80-457d-995c-137d8fad9cc9	{"sub": "f7e04a5c-ec80-457d-995c-137d8fad9cc9", "email": "oscardmunozc@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-18 01:40:41.076183+00	2025-12-18 01:40:41.076783+00	2025-12-18 01:40:41.076783+00	8cbe9378-3246-4677-ba71-68df82f4a813
9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	{"sub": "9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2", "email": "o.munoz.castro@gmail.com", "email_verified": false, "phone_verified": false}	email	2025-12-18 04:48:53.233435+00	2025-12-18 04:48:53.233486+00	2025-12-18 04:48:53.233486+00	1978d37a-68d4-4b6d-a36b-1ea61f1ab421
55b10fa7-a5b8-4536-94be-c3dd9de3d326	55b10fa7-a5b8-4536-94be-c3dd9de3d326	{"sub": "55b10fa7-a5b8-4536-94be-c3dd9de3d326", "email": "1@gmial.com", "nombres": "pepe", "apellidos": "lopez", "email_verified": false, "phone_verified": false}	email	2025-12-18 05:31:46.045846+00	2025-12-18 05:31:46.045899+00	2025-12-18 05:31:46.045899+00	1626ed1b-c4e4-4a9a-b08f-3a0aa828e9c2
d4509b87-cdd5-4603-8324-e184da1a3290	d4509b87-cdd5-4603-8324-e184da1a3290	{"sub": "d4509b87-cdd5-4603-8324-e184da1a3290", "email": "2@gmail.com", "nombres": "juanito", "apellidos": "torres", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2025-12-20 02:49:48.945776+00	2025-12-20 02:49:48.945833+00	2025-12-20 02:49:48.945833+00	412baacd-6156-4d9e-a65c-550219926799
f89f8bdb-30e6-4988-9e98-7fa7b125ba7a	f89f8bdb-30e6-4988-9e98-7fa7b125ba7a	{"sub": "f89f8bdb-30e6-4988-9e98-7fa7b125ba7a", "email": "olakasedanielxd@gmail.com", "nombres": "Daniel", "apellidos": "Munoz", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2026-01-04 05:01:11.4547+00	2026-01-04 05:01:11.455879+00	2026-01-04 05:01:11.455879+00	9b221407-fbff-4e9f-9426-cf2dc9992e04
d2841cfb-ec63-4798-8a66-cbfc9d201439	d2841cfb-ec63-4798-8a66-cbfc9d201439	{"sub": "d2841cfb-ec63-4798-8a66-cbfc9d201439", "email": "realmepy@gmail.com", "nombres": "Estudioso", "apellidos": "lopez", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2026-01-12 02:59:12.790805+00	2026-01-12 02:59:12.790857+00	2026-01-12 02:59:12.790857+00	88407339-db7b-442c-96fe-fa240d8cecac
31c2ebbb-ee74-449f-88b3-c6d250604a44	31c2ebbb-ee74-449f-88b3-c6d250604a44	{"sub": "31c2ebbb-ee74-449f-88b3-c6d250604a44", "email": "oscardmunozc@fpuna.edu.py", "nombres": "Daniel", "apellidos": "Muñoz", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2026-03-15 22:23:59.508995+00	2026-03-15 22:23:59.509066+00	2026-03-15 22:23:59.509066+00	2d1fe787-b82c-459d-9331-c3df11ccc04e
79a0830b-145c-4e91-a21e-dcccb3bbdc21	79a0830b-145c-4e91-a21e-dcccb3bbdc21	{"sub": "79a0830b-145c-4e91-a21e-dcccb3bbdc21", "email": "diazekmila@gmail.com", "nombres": "Kamila", "apellidos": "Diaz", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2026-04-26 16:01:08.50878+00	2026-04-26 16:01:08.508848+00	2026-04-26 16:01:08.508848+00	1a3a476e-36e2-47a7-821e-f25022b8f630
c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{"sub": "c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe", "email": "escurrablanca410@gmail.com", "nombres": "Blanca", "apellidos": "Escurra", "tipo_registro": "DOCENTE", "email_verified": false, "phone_verified": false}	email	2026-04-26 16:22:02.014891+00	2026-04-26 16:22:02.016398+00	2026-04-26 16:22:02.016398+00	50446961-a268-4403-ba2c-7bf93ad8d6c7
8036059d-6a24-4137-8619-b35965eedac8	8036059d-6a24-4137-8619-b35965eedac8	{"sub": "8036059d-6a24-4137-8619-b35965eedac8", "email": "kamiladiaz.2dario@gmail.com", "nombres": "Mabel", "apellidos": "Escurra", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2026-05-03 19:52:02.179024+00	2026-05-03 19:52:02.17908+00	2026-05-03 19:52:02.17908+00	36f826a2-1b95-4db9-828a-642b27d0b610
de5d085a-de9b-4c32-aa28-fb2d95466fb8	de5d085a-de9b-4c32-aa28-fb2d95466fb8	{"sub": "de5d085a-de9b-4c32-aa28-fb2d95466fb8", "email": "diazekmila@fpuna.edu.py", "nombres": "Maria", "apellidos": "Benitez", "id_cursillo": "04cbfec5-497a-480d-ba4d-1a08c982edb7", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false}	email	2026-05-10 05:19:47.22809+00	2026-05-10 05:19:47.228153+00	2026-05-10 05:19:47.228153+00	847abf31-e63a-4ba3-97fd-29417e77ce04
06debd03-598d-4b4f-bc37-0f5401f34f3f	06debd03-598d-4b4f-bc37-0f5401f34f3f	{"sub": "06debd03-598d-4b4f-bc37-0f5401f34f3f", "email": "gladysnative1@gmail.com", "nombres": "Gladys", "telefono": "0981123333", "apellidos": "N", "id_cursillo": "04cbfec5-497a-480d-ba4d-1a08c982edb7", "tipo_registro": "ESTUDIANTE", "email_verified": false, "phone_verified": false, "telefono_visible": true}	email	2026-05-12 20:58:29.524878+00	2026-05-12 20:58:29.524935+00	2026-05-12 20:58:29.524935+00	2d1aeea4-1d45-4958-afa0-78b3ea10892c
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
19bf0f0e-d2a8-44ed-82f5-13dbf5df576c	f7e04a5c-ec80-457d-995c-137d8fad9cc9	2026-05-13 03:00:41.354623+00	2026-05-13 03:00:41.354623+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	170.51.42.76	\N	\N	\N	\N	\N
c04c2803-4231-4fc0-8d1b-acdc2bb53dcd	06debd03-598d-4b4f-bc37-0f5401f34f3f	2026-05-12 20:58:29.557922+00	2026-05-13 03:58:22.233087+00	\N	aal1	\N	2026-05-13 03:58:22.232976	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	170.51.42.76	\N	\N	\N	\N	\N
5cbca21c-0bec-41c9-9578-a78a43e9e700	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	2026-05-13 03:05:42.254419+00	2026-05-13 04:44:57.990626+00	\N	aal1	\N	2026-05-13 04:44:57.990524	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	170.51.42.76	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
c04c2803-4231-4fc0-8d1b-acdc2bb53dcd	2026-05-12 20:58:29.604486+00	2026-05-12 20:58:29.604486+00	password	b4767bc7-6909-4a8f-9bb8-f70ad36599ac
19bf0f0e-d2a8-44ed-82f5-13dbf5df576c	2026-05-13 03:00:41.550633+00	2026-05-13 03:00:41.550633+00	password	2fc176e8-e737-4ba3-b950-28d05351d84a
5cbca21c-0bec-41c9-9578-a78a43e9e700	2026-05-13 03:05:42.258505+00	2026-05-13 03:05:42.258505+00	password	de39d8f9-5d03-43c4-8ba7-c4b6003bcb89
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	581	nanhkcyzi77b	f7e04a5c-ec80-457d-995c-137d8fad9cc9	f	2026-05-13 03:00:41.499636+00	2026-05-13 03:00:41.499636+00	\N	19bf0f0e-d2a8-44ed-82f5-13dbf5df576c
00000000-0000-0000-0000-000000000000	570	2roth4ztkxto	06debd03-598d-4b4f-bc37-0f5401f34f3f	t	2026-05-12 20:58:29.584042+00	2026-05-13 03:58:22.182879+00	\N	c04c2803-4231-4fc0-8d1b-acdc2bb53dcd
00000000-0000-0000-0000-000000000000	586	rcaouxwvisx2	06debd03-598d-4b4f-bc37-0f5401f34f3f	f	2026-05-13 03:58:22.206356+00	2026-05-13 03:58:22.206356+00	2roth4ztkxto	c04c2803-4231-4fc0-8d1b-acdc2bb53dcd
00000000-0000-0000-0000-000000000000	585	5rbugil2utkg	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	t	2026-05-13 03:05:42.256617+00	2026-05-13 04:44:57.915941+00	\N	5cbca21c-0bec-41c9-9578-a78a43e9e700
00000000-0000-0000-0000-000000000000	587	7oht6h6djznz	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	f	2026-05-13 04:44:57.935305+00	2026-05-13 04:44:57.935305+00	5rbugil2utkg	5cbca21c-0bec-41c9-9578-a78a43e9e700
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: cursillos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cursillos" ("id_cursillo", "nombre", "descripcion", "dominio", "fecha_creacion", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
e20d7cc7-c724-4132-a0dc-df61bf35d9b1	Cursillo Prauda	Instancia del Cursillo Prauda	\N	2026-05-09 00:34:47.814657+00	2026-05-09 00:34:47.814657+00	\N	2026-05-09 00:34:47.814657+00	\N
04cbfec5-497a-480d-ba4d-1a08c982edb7	Cursillo Test	Instancia inicial para desarrollo y pruebas	\N	2025-12-18 01:32:52.841289+00	2025-12-18 01:32:52+00	\N	2026-05-09 14:02:28.073347+00	\N
\.


--
-- Data for Name: grupos_cursos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."grupos_cursos" ("id_grupo_curso", "id_cursillo", "nombre", "descripcion", "orden", "es_activo", "fecha_creacion", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion", "requiere_password", "password_hash") FROM stdin;
95fbbf55-1154-449c-bb84-979b0a92e8cd	04cbfec5-497a-480d-ba4d-1a08c982edb7	General	Cursos existentes antes de la organizacion por grupos.	0	t	2026-05-01 10:31:51.149447+00	\N	\N	\N	\N	f	\N
fb7401dc-7429-44b2-a615-594f2a4e65a7	04cbfec5-497a-480d-ba4d-1a08c982edb7	Politécnica UNA	prueba poli	1	t	2026-05-01 11:08:51.906795+00	2026-05-01 11:08:51.906795+00	o.munoz.castro@gmail.com	2026-05-01 11:08:51.906795+00	o.munoz.castro@gmail.com	f	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."usuarios" ("id_usuario", "id_auth", "correo", "nombres", "apellidos", "telefono", "es_activo", "fecha_creacion", "biografia", "avatar_url", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion", "telefono_visible") FROM stdin;
ad211a41-7b76-48fb-b7ee-6506902b9809	f7e04a5c-ec80-457d-995c-137d8fad9cc9	oscardmunozc@gmail.com	Oscar	Munoz	\N	t	2025-12-18 01:40:41.028369+00	\N	\N	2025-12-18 01:40:41+00	\N	\N	\N	t
addf6c0f-f231-4fde-b07f-5dac430828d9	55b10fa7-a5b8-4536-94be-c3dd9de3d326	1@gmial.com	pepe	lopez	\N	t	2025-12-18 05:31:46.014635+00	\N	\N	2025-12-18 05:31:46+00	\N	\N	\N	t
d87a519d-6158-4aa0-bb70-aa107b3c91ef	d4509b87-cdd5-4603-8324-e184da1a3290	2@gmail.com	juanito	torres	\N	t	2025-12-20 02:49:48.856617+00	\N	\N	2025-12-20 02:49:48+00	\N	\N	\N	t
9924dff0-d5cf-4600-acaa-62ac57871897	f89f8bdb-30e6-4988-9e98-7fa7b125ba7a	olakasedanielxd@gmail.com	Daniel	Munoz	\N	t	2026-01-04 05:01:11.300249+00	\N	\N	2026-01-04 05:01:11+00	\N	\N	\N	t
c7b451e0-31ad-42c5-83d3-cc732f4a6391	d2841cfb-ec63-4798-8a66-cbfc9d201439	realmepy@gmail.com	Estudioso	lopez	\N	t	2026-01-12 02:59:12.738743+00	\N	\N	2026-01-12 02:59:12+00	\N	\N	\N	t
04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	o.munoz.castro@gmail.com	Oskr	Castro	0981	t	2025-12-18 04:48:53.211009+00	Soy profesor	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2/avatar.jpg	2025-12-18 04:48:53+00	\N	\N	\N	t
d955d71c-a9ef-48ff-aa40-d4c87527a9a8	31c2ebbb-ee74-449f-88b3-c6d250604a44	oscardmunozc@fpuna.edu.py	Daniel	Muñoz	\N	t	2026-03-15 22:23:59.358822+00	\N	\N	2026-03-15 22:23:59+00	\N	\N	\N	t
b24e4934-b5ff-4004-9851-1b68185a2230	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	escurrablanca410@gmail.com	Blanca	Escurra	\N	t	2026-04-26 16:22:01.732896+00	\N	\N	2026-04-26 16:22:01+00	\N	\N	\N	t
bf1e19fe-7735-43a4-bc82-77eb17a18139	79a0830b-145c-4e91-a21e-dcccb3bbdc21	diazekmila@gmail.com	Kamila	Diaz	\N	t	2026-04-26 16:01:08.213453+00	\N	79a0830b-145c-4e91-a21e-dcccb3bbdc21/avatar.jpg	2026-04-26 16:01:08+00	\N	2026-05-03 19:49:07.517038+00	diazekmila@gmail.com	t
72b1f474-245b-42f3-89ff-eae5e6bb86e1	8036059d-6a24-4137-8619-b35965eedac8	kamiladiaz.2dario@gmail.com	Mabel	Escurra	\N	t	2026-05-03 19:52:02.124104+00	\N	\N	2026-05-03 19:52:02.124104+00	\N	2026-05-03 19:52:02.124104+00	\N	t
718f98f7-bce2-4037-8fe2-0dd18cf63124	de5d085a-de9b-4c32-aa28-fb2d95466fb8	diazekmila@fpuna.edu.py	Maria	Benitez	\N	t	2026-05-10 05:19:47.096394+00	\N	\N	2026-05-10 05:19:47.096394+00	\N	2026-05-10 05:19:47.096394+00	\N	t
939e1ed8-51e3-4762-96ac-c3294e793c0f	06debd03-598d-4b4f-bc37-0f5401f34f3f	gladysnative1@gmail.com	Gladys	N	0981123333	t	2026-05-12 20:58:29.344851+00	\N	\N	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N	t
\.


--
-- Data for Name: cursos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cursos" ("id_curso", "id_cursillo", "titulo", "descripcion", "es_publicado", "fecha_creacion", "id_docente", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion", "id_grupo_curso", "requiere_password", "password_hash") FROM stdin;
6ec4de58-a98b-4af6-9808-a1d65f0aae10	04cbfec5-497a-480d-ba4d-1a08c982edb7	Química General	Fundamentos de química: estructura atómica, tabla periódica, enlaces químicos y reacciones básicas.	t	2025-12-20 06:11:22.995581+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2025-12-20 06:11:22+00	\N	2026-05-01 10:31:51.149447+00	\N	95fbbf55-1154-449c-bb84-979b0a92e8cd	f	\N
37ae8f48-78fd-4c88-8b00-e3cca4b27b30	04cbfec5-497a-480d-ba4d-1a08c982edb7	Castellano	Busca desarrollar habilidades de comunicación oral y escrita, comprensión lectora, ortografía, morfosintaxis y producción de textos coherentes	t	2026-04-26 20:34:38.09321+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-04-26 20:34:38+00	\N	2026-05-01 10:31:51.149447+00	\N	95fbbf55-1154-449c-bb84-979b0a92e8cd	f	\N
db148885-4a53-4c45-88a6-ad4bb4d326fb	04cbfec5-497a-480d-ba4d-1a08c982edb7	Física	Física básica	t	2026-05-01 11:10:25.973447+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-05-01 11:10:25.973447+00	o.munoz.castro@gmail.com	2026-05-01 11:10:25.973447+00	o.munoz.castro@gmail.com	fb7401dc-7429-44b2-a615-594f2a4e65a7	f	\N
bd793575-9ee5-4133-b2d9-154832e7214a	04cbfec5-497a-480d-ba4d-1a08c982edb7	Guarani	Pruebas	t	2026-05-01 09:31:43.931491+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-05-01 09:31:43.931491+00	o.munoz.castro@gmail.com	2026-05-10 16:30:41.998967+00	o.munoz.castro@gmail.com	95fbbf55-1154-449c-bb84-979b0a92e8cd	t	$2a$06$ymTJWa7AHj5rrASGP7ZQk.NvNt2r13cw5C22g6caUY51DAWV8RfkK
4a7cd16e-8a79-4fc1-bcd5-62b2a67bba93	04cbfec5-497a-480d-ba4d-1a08c982edb7	Geometría Análitica	La geometría analítica es una rama de las matemáticas que estudia figuras geométricas (puntos, líneas, planos) utilizando un sistema de coordenadas (plano cartesiano) y métodos algebraicos. Permite representar formas mediante ecuaciones y resolver problemas geométricos mediante cálculo algebraico, siendo René Descartes su principal precursor	t	2026-05-10 01:17:21.672502+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-10 01:17:21.672502+00	escurrablanca410@gmail.com	2026-05-10 19:57:59.039488+00	escurrablanca410@gmail.com	fb7401dc-7429-44b2-a615-594f2a4e65a7	f	\N
a434ec52-fe75-47b0-97e6-aeb874e90d1b	04cbfec5-497a-480d-ba4d-1a08c982edb7	Aritmetica	\N	t	2026-05-10 22:38:21.868984+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-10 22:38:21.868984+00	escurrablanca410@gmail.com	2026-05-10 22:38:22.512669+00	escurrablanca410@gmail.com	fb7401dc-7429-44b2-a615-594f2a4e65a7	t	$2a$06$iVX.lIHci1aquUeytQTSCOpNS9rMM4FraCDNkV5ghFcwZK4BceOmC
fa7822dc-0c95-44b8-ba1b-f6df9fde555b	04cbfec5-497a-480d-ba4d-1a08c982edb7	Matemáticas Básicas	Curso introductorio de matemáticas: aritmética, álgebra y geometría básica. Ideal para reforzar fundamentos.	t	2025-12-20 06:11:22.995581+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2025-12-20 06:11:22+00	\N	2026-05-02 03:41:16.14528+00	o.munoz.castro@gmail.com	95fbbf55-1154-449c-bb84-979b0a92e8cd	f	\N
d0f6ea7d-5b7f-438c-a0de-878cab667f28	04cbfec5-497a-480d-ba4d-1a08c982edb7	Geometria	La geometría es la rama de las matemáticas que estudia las propiedades, medidas y relaciones de puntos, líneas, ángulos, superficies y sólidos en el plano (2D) y el espacio (3D). Es fundamental para el dibujo técnico, ingeniería, arquitectura y la medición de formas, basándose en conceptos como polígonos, circunferencias y poliedros.	t	2026-05-03 16:18:51.274267+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-03 16:18:51.274267+00	escurrablanca410@gmail.com	2026-05-03 16:26:16.371819+00	escurrablanca410@gmail.com	fb7401dc-7429-44b2-a615-594f2a4e65a7	f	\N
\.


--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."modulos" ("id_modulo", "id_curso", "titulo", "orden", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
3af4ec8b-1468-4818-ade4-b8bc804adf61	fa7822dc-0c95-44b8-ba1b-f6df9fde555b	Modulo1 prueba	1	2026-05-01 08:55:45+00	\N	\N	\N
1134c18b-7a10-4700-b729-9c211907d87f	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	Introducción	1	2026-05-01 08:55:45+00	\N	\N	\N
e1900f20-d9ea-4cbb-a929-a455f140f76c	d0f6ea7d-5b7f-438c-a0de-878cab667f28	Unidad 1 - Conceptos básicos de geometría	1	2026-05-03 16:28:46.210428+00	escurrablanca410@gmail.com	2026-05-03 16:29:12.003223+00	escurrablanca410@gmail.com
d399a4d4-6838-4561-828f-4268fbe4355d	4a7cd16e-8a79-4fc1-bcd5-62b2a67bba93	Introducción	1	2026-05-10 01:20:08.292441+00	escurrablanca410@gmail.com	2026-05-10 01:20:08.292441+00	escurrablanca410@gmail.com
3708aa83-6c88-494b-a04e-1e5682da95b7	d0f6ea7d-5b7f-438c-a0de-878cab667f28	Unidad 2 - El plano cartesiano y ubicación de puntos	2	2026-05-10 23:12:57.298482+00	escurrablanca410@gmail.com	2026-05-10 23:12:57.298482+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: lecciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."lecciones" ("id_leccion", "id_modulo", "titulo", "tipo_contenido", "contenido_texto", "url_contenido", "orden", "es_publicada", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
356baf48-9b6b-4300-86b4-7ef6526637c9	3af4ec8b-1468-4818-ade4-b8bc804adf61	Prueb2pdf	PDF	\N	https://yqihshuxxbadzzglpcun.supabase.co/storage/v1/object/public/contenido_lecciones/pdfs/1766894592701_76vu7f.pdf	1	t	2026-05-01 08:55:45+00	\N	\N	\N
a812d7ae-2b93-4d78-b9f4-cbec487df59a	3af4ec8b-1468-4818-ade4-b8bc804adf61	Prueba3texto	TEXTO	UNIDAD I\nLÓGICA MATEMÁTICA Y CONJUNTOS\nCAPACIDAD\nAplica la lógica matemática para la solución de problemas aritméticos, algebraicos y para la\ndeterminación de conjuntos numéricos\nCONTENIDOS PROCEDIMENTALES\n• Determina el valor de una proposición lógica y las operaciones que las relacionan\n• Representa  conjuntos mediante diagramas.\n• Resuelve problemas con igualdad de conjuntos.  \n• Conjunto universal y conjunto vacío.\n• Utiliza las operaciones con conjuntos en problemas relacionados con su especialidad.\n• Determina y aplica la cardinalidad de los Conjuntos en la solución de problemas\nrelacionados con su especialidad.\n• Utiliza los cuantificadores como lenguaje matemático	\N	3	t	2026-05-01 08:55:45+00	\N	\N	\N
0e28011e-517b-4995-82e3-aeb59ba10ee8	3af4ec8b-1468-4818-ade4-b8bc804adf61	Prueba4cestionario	TEXTO	aqui probaremos el cuestionario	\N	3	t	2026-05-01 08:55:45+00	\N	\N	\N
2bf2c3db-3ab3-4ab6-a888-ee43d78276c9	3af4ec8b-1468-4818-ade4-b8bc804adf61	Prueba1video	VIDEO	\N	https://youtu.be/CH5NYR6EDVk	1	t	2026-05-01 08:55:45+00	\N	\N	\N
5e2ebf5a-9033-40ae-b203-7c679242efbf	3af4ec8b-1468-4818-ade4-b8bc804adf61	Prueba de tareas	PDF	\N	https://yqihshuxxbadzzglpcun.supabase.co/storage/v1/object/public/contenido_lecciones/pdfs/1776605598940_bva1kb.pdf	4	t	2026-05-01 08:55:45+00	\N	\N	\N
d2ec3745-29af-44ed-8d64-cb25c12468c8	1134c18b-7a10-4700-b729-9c211907d87f	La oración simple	TEXTO	¿Qué es una oración?\nEs un conjunto de palabras con sentido completo que expresa una idea.\n\nEjemplo:\n“El alumno estudia.”\n\nPartes básicas de la oración:\n\nSujeto: quién realiza la acción.\nPredicado: lo que se dice del sujeto.\n\nEjemplo:\n“El alumno estudia.”\nSujeto: el alumno\nPredicado: estudia\n\nNúcleos:\n\nNúcleo del sujeto: sustantivo principal.\nNúcleo del predicado: verbo.\n\nEjemplo:\n“La profesora explica la lección.”\nNúcleo del sujeto: profesora\nNúcleo del predicado: explica\n\nRegla práctica:\nPara encontrar el predicado, primero se identifica el verbo.	\N	1	t	2026-05-01 08:55:45+00	\N	\N	\N
d0144e86-2d95-4cb1-86ab-6f6fe2f96997	e1900f20-d9ea-4cbb-a929-a455f140f76c	Conceptos básicos de geometría	PDF	\N	https://yqihshuxxbadzzglpcun.supabase.co/storage/v1/object/public/contenido_lecciones/pdfs/1777825909172_r23tx9.pdf	1	t	2026-05-03 16:32:01.99651+00	escurrablanca410@gmail.com	2026-05-03 16:32:01.99651+00	escurrablanca410@gmail.com
06f89e2b-6e9c-44e4-b2c9-715f636bf18f	d399a4d4-6838-4561-828f-4268fbe4355d	¿Qué es la Geometría Analítica?	PDF	\N		1	t	2026-05-10 01:53:07.933379+00	escurrablanca410@gmail.com	2026-05-10 23:09:24.704844+00	escurrablanca410@gmail.com
98485be7-75e4-41fa-a407-010023860de2	3708aa83-6c88-494b-a04e-1e5682da95b7	Lección	PDF	\N		1	t	2026-05-10 23:14:21.409526+00	escurrablanca410@gmail.com	2026-05-10 23:20:42.646997+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: adjuntos_leccion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."adjuntos_leccion" ("id_adjunto", "id_leccion", "nombre", "tipo", "ruta_storage", "url_externa", "tipo_mime", "tamano_bytes", "bucket", "fecha_subida", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
8de9a87e-d70f-408e-b35a-5e00f83ac758	2bf2c3db-3ab3-4ab6-a888-ee43d78276c9	20250122_124320.jpg	ARCHIVO	https://yqihshuxxbadzzglpcun.supabase.co/storage/v1/object/public/contenido_lecciones/adjuntos/2bf2c3db-3ab3-4ab6-a888-ee43d78276c9/1766464247882_7akiuj.jpg	\N	image/jpeg	2698847	contenido_lecciones	2025-12-23 04:30:51.702881+00	2025-12-23 04:30:51+00	\N	\N	\N
5bd3644f-b69c-4fd4-bcef-c70aef948fdd	a812d7ae-2b93-4d78-b9f4-cbec487df59a	Matematicas_Basicas_v2.pdf	ARCHIVO	https://yqihshuxxbadzzglpcun.supabase.co/storage/v1/object/public/contenido_lecciones/adjuntos/a812d7ae-2b93-4d78-b9f4-cbec487df59a/1766896575122_dtqll.pdf	\N	application/pdf	2978600	contenido_lecciones	2025-12-28 04:36:18.759534+00	2025-12-28 04:36:18+00	\N	\N	\N
e8d7a206-2d48-4567-a690-5339687b959f	d2ec3745-29af-44ed-8d64-cb25c12468c8	Concepto de oración	LINK	\N	https://concepto.de/oracion/	\N	\N	contenido_lecciones	2026-04-26 21:14:53.827633+00	2026-04-26 21:14:53+00	\N	\N	\N
3961a280-c306-41c0-8799-2bac6b1223c4	d0144e86-2d95-4cb1-86ab-6f6fe2f96997	ejercicios_geometria_1.pdf	ARCHIVO	https://yqihshuxxbadzzglpcun.supabase.co/storage/v1/object/public/contenido_lecciones/adjuntos/d0144e86-2d95-4cb1-86ab-6f6fe2f96997/1777826113887_efbiy.pdf	\N	application/pdf	2386	contenido_lecciones	2026-05-03 16:35:19.873018+00	2026-05-03 16:35:19.873018+00	escurrablanca410@gmail.com	2026-05-03 16:35:19.873018+00	escurrablanca410@gmail.com
92c0af12-8a15-440b-83bc-244876764aa0	06f89e2b-6e9c-44e4-b2c9-715f636bf18f	Geo Analitica: Bases	LINK	\N	https://www.youtube.com/watch?v=u25vkjeCrF4	\N	\N	contenido_lecciones	2026-05-10 02:43:46.792877+00	2026-05-10 02:43:46.792877+00	escurrablanca410@gmail.com	2026-05-10 02:43:46.792877+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: anuncios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."anuncios" ("id_anuncio", "id_cursillo", "id_curso", "titulo", "contenido", "fecha_publicacion", "id_creador", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
2bf13edb-72fd-488b-a04b-aeca5561f99b	04cbfec5-497a-480d-ba4d-1a08c982edb7	\N	Feliz año nuevo!	prueba de anuncio 1	2026-01-01 19:06:40.465769+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-01-01 19:06:40+00	\N	\N	\N
1fcc7e2b-bb1c-4f46-9a9d-59839d5c3b1e	04cbfec5-497a-480d-ba4d-1a08c982edb7	\N	prueba viernes	prueba de mail todos	2026-03-07 00:08:38.829309+00	ad211a41-7b76-48fb-b7ee-6506902b9809	2026-03-07 00:08:38+00	\N	\N	\N
75b1b12a-9669-4112-83db-dcaf1d08fb57	04cbfec5-497a-480d-ba4d-1a08c982edb7	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	Introducción Castellano	Primera Lección publicada! \nIncluye tarea y evaluación 👌	2026-04-26 22:16:10.767571+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-04-26 22:16:10+00	\N	\N	\N
90a5013b-362d-46f4-8599-b93950e244cf	04cbfec5-497a-480d-ba4d-1a08c982edb7	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	Bienvenida Castellano	Bienvenidos Alumnos!	2026-04-26 22:18:22.280172+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-04-26 22:18:22+00	\N	\N	\N
4dcf75e7-4229-455f-931e-eb3905d0c4e0	04cbfec5-497a-480d-ba4d-1a08c982edb7	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	anuncio 1	Prueba 	2026-04-28 03:06:33.814493+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-04-28 03:06:33+00	\N	\N	\N
310aefc4-31af-4322-bc3c-a0d0f7950dc1	04cbfec5-497a-480d-ba4d-1a08c982edb7	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	Clase presencial	Buenas tardes! Hoy clase presencial!	2026-05-03 15:26:21.807089+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-03 15:26:21.807089+00	escurrablanca410@gmail.com	2026-05-03 15:26:21.807089+00	escurrablanca410@gmail.com
46f64ea2-6086-4b56-be54-6802a0540774	04cbfec5-497a-480d-ba4d-1a08c982edb7	4a7cd16e-8a79-4fc1-bcd5-62b2a67bba93	Primera lección publicada en la plataforma	Buenas noches alumnos!\nFavor fijarse en la lección publicada, cualquier duda quedo atenta	2026-05-10 03:40:02.695842+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-10 03:40:02.695842+00	escurrablanca410@gmail.com	2026-05-10 03:40:52.050143+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: tareas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."tareas" ("id_tarea", "id_leccion", "titulo", "descripcion", "fecha_limite", "permite_reintentos", "max_reintentos", "fecha_creacion", "puntaje_maximo", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
dfdde22b-83c2-4650-a2d6-bd5e859560bd	a812d7ae-2b93-4d78-b9f4-cbec487df59a	tarealeccion1	descripcion de tarealeccion1	\N	t	2	2025-12-29 02:59:07.628023+00	4	2025-12-29 02:59:07+00	\N	\N	\N
f58242c1-b167-4945-a124-ffbfa56cfc35	5e2ebf5a-9033-40ae-b203-7c679242efbf	Prueba de tarea de matematica	Resuelve los ejercicios del pdf de la lección. Cada ejercicio vale 2 puntos.	\N	f	3	2026-04-19 13:33:21.791136+00	4	2026-04-19 13:33:21+00	\N	\N	\N
976f5f12-6944-4642-9178-09fe85989113	d2ec3745-29af-44ed-8d64-cb25c12468c8	Tarea – Lección 1: La oración simple	1. Separar sujeto y predicado:\na) La niña canta\nb) El profesor explica el tema\nc) Mis amigos juegan fútbol.\n\n2. Indicar el núcleo del sujeto y del predicado:\na) El gato duerme.\nb) Los alumnos estudian mucho.\n\n3. Completar con un sujeto adecuado:\na) _________ corre rápido.\nb) _________ leen un libro.	2026-05-20 03:00:00+00	t	2	2026-04-26 21:14:54.282931+00	4	2026-04-26 21:14:54+00	\N	\N	\N
35f76432-630a-4f74-8e40-67ef39654ec2	06f89e2b-6e9c-44e4-b2c9-715f636bf18f	Tarea - Lección 1	\N	\N	t	3	2026-05-10 02:44:31.520632+00	10	2026-05-10 02:44:31.520632+00	escurrablanca410@gmail.com	2026-05-10 02:44:31.520632+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: entregas_tareas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."entregas_tareas" ("id_entrega", "id_tarea", "id_usuario", "comentario_estudiante", "estado", "calificacion", "comentario_docente", "fecha_entrega", "retroalimentacion_archivo_url", "fecha_correccion", "id_docente_corrector", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
0fdd0df4-10f5-4ca7-879d-bdbc41acb69c	f58242c1-b167-4945-a124-ffbfa56cfc35	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	Realizamos la entrega!	CALIFICADO	3.00	Te equivocaste en el resultado del segundo ejercicio, por eso no lograste el puntaje total.\nTe paso la solución correcta de ese ejercicio.	2026-04-19 18:34:04.217725+00	retroalimentacion_tareas/0fdd0df4-10f5-4ca7-879d-bdbc41acb69c/docente_1776629140431.jpeg	2026-04-19 20:05:41.84+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-04-19 18:34:04+00	\N	\N	\N
fbf4ce42-d64e-4472-9c67-858adc42160e	dfdde22b-83c2-4650-a2d6-bd5e859560bd	addf6c0f-f231-4fde-b07f-5dac430828d9	se prueba la entrega de alumno	CALIFICADO	4.00	se prueba la retroalimentación	2025-12-30 01:53:43.179844+00	\N	2026-05-09 16:57:49.5+00	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2025-12-30 01:53:43+00	\N	2026-05-09 16:57:49.616954+00	o.munoz.castro@gmail.com
60225811-eeed-4b8e-8edd-9d4078072cb6	976f5f12-6944-4642-9178-09fe85989113	bf1e19fe-7735-43a4-bc82-77eb17a18139	1. Separar sujeto y predicado:\na) La niña canta\nsujeto: La niña\npredicado: canta\nb) El profesor explica el tema\nsujeto: El profesor\npredicado: explica el tema\nc) Mis amigos juegan fútbol.\nsujeto: Mis amigos\npredicado: juegan futbol\n\n2. Indicar el núcleo del sujeto y del predicado:\na) El gato duerme.\nsujeto: El gato\npredicado: duerme\nb) Los alumnos estudian mucho.\nsujeto: Los alumnos\npredicado: estudian mucho\n\n3. Completar con un sujeto adecuado:\na) __El perro_______ corre rápido.\nb) ___Las niñas______ leen un libro.	CALIFICADO	4.00	Excelente!	2026-05-10 01:12:22.424964+00	retroalimentacion_tareas/60225811-eeed-4b8e-8edd-9d4078072cb6/docente_1778385072230.jpg	2026-05-10 03:51:13.842+00	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-10 01:12:22.424964+00	diazekmila@gmail.com	2026-05-10 03:51:14.450614+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: archivos_entregas_tareas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."archivos_entregas_tareas" ("id_archivo", "id_entrega", "bucket", "ruta_storage", "nombre_archivo", "tipo_mime", "tamano_bytes", "fecha_subida", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
dc8e667d-d657-4f41-8722-31325b90f925	fbf4ce42-d64e-4472-9c67-858adc42160e	archivos_tareas	55b10fa7-a5b8-4536-94be-c3dd9de3d326/fbf4ce42-d64e-4472-9c67-858adc42160e/cf8c5b51-e820-4c88-9de3-60dead74dde1.jpg	Prauda.jpg	image/jpeg	18712	2025-12-30 01:53:44.576942+00	2025-12-30 01:53:44+00	\N	\N	\N
19013064-c410-4024-b043-e4a0bf167e05	0fdd0df4-10f5-4ca7-879d-bdbc41acb69c	archivos_tareas	31c2ebbb-ee74-449f-88b3-c6d250604a44/0fdd0df4-10f5-4ca7-879d-bdbc41acb69c/um1fuia67xnmo63uhhf.pdf	parcial1_resuelto.pdf	application/pdf	4684870	2026-04-19 18:34:07.664722+00	2026-04-19 18:34:07+00	\N	\N	\N
\.


--
-- Data for Name: certificados_curso; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."certificados_curso" ("id_certificado", "id_curso", "plantilla", "titulo_certificado", "texto_descripcion", "firma_nombre", "firma_cargo", "mostrar_fecha", "mostrar_logo", "color_primario", "color_secundario", "fecha_creacion", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
\.


--
-- Data for Name: comentarios_leccion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."comentarios_leccion" ("id_comentario", "id_leccion", "id_usuario", "contenido", "fecha_comentario", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
331d0ce2-28b4-40b7-8a06-47afcbe83508	2bf2c3db-3ab3-4ab6-a888-ee43d78276c9	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	Prueba de comentario	2025-12-23 04:24:45.045225+00	2025-12-23 04:24:45+00	\N	\N	\N
2044e1a3-a3df-4c2c-b372-23bbd16f39da	356baf48-9b6b-4300-86b4-7ef6526637c9	addf6c0f-f231-4fde-b07f-5dac430828d9	h/op	2025-12-29 18:17:10.005149+00	2025-12-29 18:17:10+00	\N	\N	\N
b40f4547-e22a-4f6e-bc39-191028fcdc69	d0144e86-2d95-4cb1-86ab-6f6fe2f96997	b24e4934-b5ff-4004-9851-1b68185a2230	Buenas tardes! favor verificar la lección de la clase de hoy\nAdemás en archivos adjuntos se encuentran los ejercicios correspondientes	2026-05-03 16:36:08.081027+00	2026-05-03 16:36:08.081027+00	escurrablanca410@gmail.com	2026-05-03 16:36:08.081027+00	escurrablanca410@gmail.com
b07a6970-8334-4b40-9222-b19e50adf19d	d0144e86-2d95-4cb1-86ab-6f6fe2f96997	bf1e19fe-7735-43a4-bc82-77eb17a18139	Hola profe! tengo una duda con respecto al ejercicio 2, podrias adjuntar el solucionario?	2026-05-03 19:46:04.574917+00	2026-05-03 19:46:04.574917+00	diazekmila@gmail.com	2026-05-03 19:46:04.574917+00	diazekmila@gmail.com
affcebce-eb82-4ca0-927d-e38cfc7598ca	356baf48-9b6b-4300-86b4-7ef6526637c9	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	hola	2026-05-03 20:18:48.29781+00	2026-05-03 20:18:48.29781+00	o.munoz.castro@gmail.com	2026-05-03 20:18:48.29781+00	o.munoz.castro@gmail.com
\.


--
-- Data for Name: curso_docentes_colaboradores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."curso_docentes_colaboradores" ("id_curso_docente_colaborador", "id_curso", "id_docente", "fecha_asignacion", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
ed985367-0e43-42af-917b-4df39bfe6e52	fa7822dc-0c95-44b8-ba1b-f6df9fde555b	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-02 03:41:16.418763+00	2026-05-02 03:41:16.418763+00	o.munoz.castro@gmail.com	2026-05-02 03:41:16.418763+00	o.munoz.castro@gmail.com
fa4fb954-8e69-4f83-a530-eb4341060a62	d0f6ea7d-5b7f-438c-a0de-878cab667f28	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-05-03 16:26:16.686625+00	2026-05-03 16:26:16.686625+00	escurrablanca410@gmail.com	2026-05-03 16:26:16.686625+00	escurrablanca410@gmail.com
ef2a7c6a-d77b-4edb-8971-4c1469f345a3	4a7cd16e-8a79-4fc1-bcd5-62b2a67bba93	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	2026-05-10 19:57:59.39934+00	2026-05-10 19:57:59.39934+00	escurrablanca410@gmail.com	2026-05-10 19:57:59.39934+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: evaluaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."evaluaciones" ("id_evaluacion", "id_leccion", "titulo", "descripcion", "tiempo_limite_min", "intentos_max", "fecha_creacion", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
e51baf4d-a6b2-48c7-8353-55404d1e647c	0e28011e-517b-4995-82e3-aeb59ba10ee8	cuestionario1prueba	descriocion1	\N	1	2025-12-30 02:19:07.404275+00	2025-12-30 02:19:07+00	\N	\N	\N
f6129a16-3014-49e2-a603-17bf8685b4cb	2bf2c3db-3ab3-4ab6-a888-ee43d78276c9	Examen básico de matemáticas	Este será el primer cuestionario de matemáticas del curso	\N	3	2026-03-30 03:57:27.906269+00	2026-03-30 03:57:27+00	\N	\N	\N
c4ce1f6b-81df-4bf3-97c0-ae652901c87d	d2ec3745-29af-44ed-8d64-cb25c12468c8	Evaluación Sumatoria - Lección 1	\N	\N	1	2026-04-26 21:14:54.750657+00	2026-04-26 21:14:54+00	\N	\N	\N
32630eed-1739-41a9-96e9-431ca533978f	5e2ebf5a-9033-40ae-b203-7c679242efbf	latex	\N	\N	1	2026-04-27 04:37:34.572206+00	2026-04-27 04:37:34+00	\N	\N	\N
f43b8d80-7738-4dd8-b956-6c80343cb94a	06f89e2b-6e9c-44e4-b2c9-715f636bf18f	Evaluación GA - Lección 1	\N	5	1	2026-05-10 03:23:10.28173+00	2026-05-10 03:23:10.28173+00	escurrablanca410@gmail.com	2026-05-10 03:23:10.28173+00	escurrablanca410@gmail.com
159b98ae-58a6-4887-8760-13250bbf0c4f	06f89e2b-6e9c-44e4-b2c9-715f636bf18f	Segunda Evaluación	\N	3	1	2026-05-10 23:09:20.508189+00	2026-05-10 23:09:20.508189+00	escurrablanca410@gmail.com	2026-05-10 23:09:20.508189+00	escurrablanca410@gmail.com
4bc2b0df-eb17-4127-a952-94072d65295e	98485be7-75e4-41fa-a407-010023860de2	Evaluacion Modulo 2	\N	3	1	2026-05-10 23:20:37.202939+00	2026-05-10 23:20:37.202939+00	escurrablanca410@gmail.com	2026-05-10 23:20:37.202939+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: intentos_evaluacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."intentos_evaluacion" ("id_intento", "id_evaluacion", "id_usuario", "puntaje_obtenido", "estado", "fecha_inicio", "fecha_envio", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
46b5c516-e8c9-4694-8152-d34eb78abf55	e51baf4d-a6b2-48c7-8353-55404d1e647c	addf6c0f-f231-4fde-b07f-5dac430828d9	20.00	COMPLETADO	2025-12-30 02:36:34.359045+00	2025-12-30 02:42:37.808+00	2025-12-30 02:36:34+00	\N	\N	\N
84be05f5-2029-435e-824a-be12ef9cf273	f6129a16-3014-49e2-a603-17bf8685b4cb	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	2.00	RECLAMADO	2026-03-30 05:09:16.381862+00	2026-03-30 05:12:41.99+00	2026-03-30 05:09:16+00	\N	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py
79ca1375-2de3-4fb9-afad-ec26130f65c1	c4ce1f6b-81df-4bf3-97c0-ae652901c87d	bf1e19fe-7735-43a4-bc82-77eb17a18139	3.00	CORREGIDO	2026-04-26 22:27:37.622354+00	2026-04-26 22:28:01.174+00	2026-04-26 22:27:37+00	\N	2026-05-10 04:29:56.040102+00	escurrablanca410@gmail.com
8576dea7-1679-48bb-86eb-98147186835e	f43b8d80-7738-4dd8-b956-6c80343cb94a	bf1e19fe-7735-43a4-bc82-77eb17a18139	2.00	AUTOCORREGIDO	2026-05-10 04:31:50.945748+00	2026-05-10 18:16:48.970157+00	2026-05-10 04:31:50.945748+00	diazekmila@gmail.com	2026-05-10 18:16:48.970157+00	diazekmila@gmail.com
51eed741-6f38-4f7d-98dc-737a5efd77b5	c4ce1f6b-81df-4bf3-97c0-ae652901c87d	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	3.00	COMPLETADO	2026-05-10 18:25:31.560095+00	2026-05-10 18:26:12.101345+00	2026-05-10 18:25:31.560095+00	oscardmunozc@fpuna.edu.py	2026-05-10 18:26:12.101345+00	oscardmunozc@fpuna.edu.py
b29946b0-2336-463c-9e94-9e9a8dbe267c	4bc2b0df-eb17-4127-a952-94072d65295e	bf1e19fe-7735-43a4-bc82-77eb17a18139	1.00	AUTOCORREGIDO	2026-05-10 23:21:28.528273+00	2026-05-10 23:21:39.548242+00	2026-05-10 23:21:28.528273+00	diazekmila@gmail.com	2026-05-10 23:21:39.548242+00	diazekmila@gmail.com
\.


--
-- Data for Name: imagenes_resolucion_intento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."imagenes_resolucion_intento" ("id_imagen", "id_intento", "bucket", "ruta_storage", "nombre_archivo", "tipo_mime", "tamano_bytes", "fecha_subida", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
\.


--
-- Data for Name: inscripciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."inscripciones" ("id_inscripcion", "id_curso", "id_usuario", "fecha_inscripcion", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
b5f0219f-4034-4280-8872-a57edbd46758	fa7822dc-0c95-44b8-ba1b-f6df9fde555b	addf6c0f-f231-4fde-b07f-5dac430828d9	2025-12-20 06:17:07.877628+00	2025-12-20 06:17:07+00	\N	\N	\N
ab047bbc-8dd6-475e-b693-014b17cb6b7d	fa7822dc-0c95-44b8-ba1b-f6df9fde555b	9924dff0-d5cf-4600-acaa-62ac57871897	2026-03-04 23:14:19.201399+00	2026-03-04 23:14:19+00	\N	\N	\N
ddd78910-6933-471a-8e2b-c36348c86647	fa7822dc-0c95-44b8-ba1b-f6df9fde555b	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	2026-03-30 05:07:05.648953+00	2026-03-30 05:07:05+00	\N	\N	\N
15ffeb4b-8ec2-432c-97bd-a0f78895e9c2	6ec4de58-a98b-4af6-9808-a1d65f0aae10	bf1e19fe-7735-43a4-bc82-77eb17a18139	2026-04-26 21:18:14.654334+00	2026-04-26 21:18:14+00	\N	\N	\N
2276e91f-78db-4b7e-934f-b3d72d31d1c4	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	bf1e19fe-7735-43a4-bc82-77eb17a18139	2026-04-26 21:24:49.225144+00	2026-04-26 21:24:49+00	\N	\N	\N
df6646eb-8fc6-45dc-9d37-9176d2e1c2b5	d0f6ea7d-5b7f-438c-a0de-878cab667f28	bf1e19fe-7735-43a4-bc82-77eb17a18139	2026-05-03 19:40:36.48468+00	2026-05-03 19:40:36.48468+00	diazekmila@gmail.com	2026-05-03 19:40:36.48468+00	diazekmila@gmail.com
de3400ac-f359-422c-93c1-310b9a355cf8	37ae8f48-78fd-4c88-8b00-e3cca4b27b30	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	2026-05-04 02:07:29.730681+00	2026-05-04 02:07:29.730681+00	oscardmunozc@fpuna.edu.py	2026-05-04 02:07:29.730681+00	oscardmunozc@fpuna.edu.py
62204462-c91a-43cc-87fb-d80d417944c0	4a7cd16e-8a79-4fc1-bcd5-62b2a67bba93	bf1e19fe-7735-43a4-bc82-77eb17a18139	2026-05-10 02:54:34.879734+00	2026-05-10 02:54:34.879734+00	diazekmila@gmail.com	2026-05-10 02:54:34.879734+00	diazekmila@gmail.com
ede72f8e-1c73-4bae-9322-48ec3b42280f	bd793575-9ee5-4133-b2d9-154832e7214a	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	2026-05-10 21:14:45.312358+00	2026-05-10 21:14:45.312358+00	oscardmunozc@fpuna.edu.py	2026-05-10 21:14:45.312358+00	oscardmunozc@fpuna.edu.py
f9c912f0-0911-4263-a255-0d4606233993	a434ec52-fe75-47b0-97e6-aeb874e90d1b	bf1e19fe-7735-43a4-bc82-77eb17a18139	2026-05-10 22:41:53.835325+00	2026-05-10 22:41:53.835325+00	diazekmila@gmail.com	2026-05-10 22:41:53.835325+00	diazekmila@gmail.com
\.


--
-- Data for Name: notificaciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notificaciones" ("id_notificacion", "id_usuario", "tipo", "mensaje", "leido", "fecha_envio", "titulo", "link", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion", "id_cursillo") FROM stdin;
1dcc2a2f-47c3-486f-a71e-358b19dd8e50	addf6c0f-f231-4fde-b07f-5dac430828d9	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	t	2025-12-20 05:45:06.195349+00	¡Cuenta aprobada!	\N	2025-12-20 05:45:06+00	\N	\N	\N	\N
318907f0-fe71-4d78-829a-9dcdeb92504f	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Daniel Munoz	f	2026-01-04 05:01:11.300249+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-01-04 05:01:11+00	\N	\N	\N	\N
0ba544aa-85f7-4395-ad30-a054a2537651	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Daniel Munoz	t	2026-01-04 05:01:11.300249+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-01-04 05:01:11+00	\N	\N	\N	\N
c1d35809-e4de-45ef-8a5c-1e39c62c8d20	9924dff0-d5cf-4600-acaa-62ac57871897	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	f	2026-01-04 05:20:27.444677+00	¡Cuenta aprobada!	\N	2026-01-04 05:20:27+00	\N	\N	\N	\N
c623ed10-2947-4c48-8482-d5d671ea2917	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Estudioso lopez	f	2026-01-12 02:59:12.738743+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-01-12 02:59:12+00	\N	\N	\N	\N
49560811-e243-4bc1-b748-9e63eea8e5c3	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Estudioso lopez	t	2026-01-12 02:59:12.738743+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-01-12 02:59:12+00	\N	\N	\N	\N
0c39410f-b9a4-42fd-bd9e-7e58b0ca1aa3	c7b451e0-31ad-42c5-83d3-cc732f4a6391	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	f	2026-01-12 03:13:08.679354+00	¡Cuenta aprobada!	\N	2026-01-12 03:13:08+00	\N	\N	\N	\N
86eae8a6-2993-4144-ad27-5b07265e5304	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Daniel Muñoz	f	2026-03-15 22:23:59.358822+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-03-15 22:23:59+00	\N	\N	\N	\N
66d778cc-9cee-4fe9-8bf2-bdcd7d47e1ae	d87a519d-6158-4aa0-bb70-aa107b3c91ef	usuario_rechazado	Tu solicitud de registro ha sido rechazada.	f	2026-03-15 23:45:56.830269+00	Solicitud rechazada	\N	2026-03-15 23:45:56+00	\N	\N	\N	\N
9f18c343-557f-48b8-aaad-a2bef4baf7f5	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	CORRECCION	Tu evaluación "Prueba eliminar" ha sido corregida. Puntaje: 2/2	t	2026-04-03 05:22:44.807815+00	Evaluación corregida	/evaluaciones/8f50fbb5-7201-4dbc-a9ff-3a14069cfc4b	2026-04-03 05:22:44+00	\N	\N	\N	\N
97c11fa6-a4d0-403f-9ee5-b6a872c5b1d0	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	t	2026-03-15 23:17:17.683967+00	¡Cuenta aprobada!	\N	2026-03-15 23:17:17+00	\N	\N	\N	\N
f1067b00-f7ab-4789-a031-4d7da84b58fb	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Daniel Muñoz	t	2026-03-15 22:23:59.358822+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-03-15 22:23:59+00	\N	\N	\N	\N
d176fd5a-9584-4459-a6e5-b3436a638c33	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	CORRECCION	Tu tarea "Prueba de tarea de matematica" ha sido calificada. Nota: 3/4 (75%)	t	2026-04-19 20:05:42.417698+00	Tarea corregida	/tareas/f58242c1-b167-4945-a124-ffbfa56cfc35	2026-04-19 20:05:42+00	\N	\N	\N	\N
831ddfe7-5248-478c-9a61-5c5d28f2e5bd	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Kamila Diaz	f	2026-04-26 16:01:08.213453+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-04-26 16:01:08+00	\N	\N	\N	\N
9adff2b3-cc66-49db-bacc-877188f68160	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Blanca Escurra	f	2026-04-26 16:22:01.732896+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-04-26 16:22:01+00	\N	\N	\N	\N
3ffde9a6-91b8-4472-8515-f96806309cdf	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Blanca Escurra	t	2026-04-26 16:22:01.732896+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-04-26 16:22:01+00	\N	\N	\N	\N
0795ca19-5328-417b-9dc1-d65f172b4213	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Kamila Diaz	t	2026-04-26 16:01:08.213453+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-04-26 16:01:08+00	\N	\N	\N	\N
42a85a82-5b9a-426e-a28c-e204d9da5fe4	b24e4934-b5ff-4004-9851-1b68185a2230	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	t	2026-04-26 17:30:01.849763+00	¡Cuenta aprobada!	\N	2026-04-26 17:30:01+00	\N	2026-05-03 15:20:23.503395+00	escurrablanca410@gmail.com	\N
64539ac8-a86c-4f33-b8c6-556a19b376cb	bf1e19fe-7735-43a4-bc82-77eb17a18139	CORRECCION	Tu evaluación "Evaluación Sumatoria - Lección 1" ha sido corregida. Puntaje: 2/4 (50%)	t	2026-04-26 22:29:45.996198+00	Evaluación corregida	/evaluaciones/c4ce1f6b-81df-4bf3-97c0-ae652901c87d	2026-04-26 22:29:45+00	\N	2026-05-03 19:31:37.980495+00	diazekmila@gmail.com	\N
be58852d-c881-4e46-856d-858d64cd18d6	bf1e19fe-7735-43a4-bc82-77eb17a18139	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	t	2026-04-26 17:27:30.857742+00	¡Cuenta aprobada!	\N	2026-04-26 17:27:30+00	\N	2026-05-03 19:31:52.939468+00	diazekmila@gmail.com	\N
768a9438-e62b-4783-8683-53d049bb408c	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Mabel Escurra	f	2026-05-03 19:52:02.124104+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-03 19:52:02.124104+00	\N	2026-05-03 19:52:02.124104+00	\N	\N
7407e8ac-0597-462c-b288-19259ac55ae1	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Mabel Escurra	f	2026-05-03 19:52:02.124104+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-03 19:52:02.124104+00	\N	2026-05-03 19:52:02.124104+00	\N	\N
d453dd0e-8051-4efb-b774-5dd406abe894	b24e4934-b5ff-4004-9851-1b68185a2230	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Mabel Escurra	f	2026-05-03 19:52:02.124104+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-03 19:52:02.124104+00	\N	2026-05-03 19:52:02.124104+00	\N	\N
c3af4ab7-4463-4154-9a3d-848837023682	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Examen básico de matemáticas".	f	2026-05-09 19:08:27.137403+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/84be05f5-2029-435e-824a-be12ef9cf273	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	\N
420fabf4-1d95-4fcf-8647-5f6917c8079a	ad211a41-7b76-48fb-b7ee-6506902b9809	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Examen básico de matemáticas".	f	2026-05-09 19:08:27.137403+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/84be05f5-2029-435e-824a-be12ef9cf273	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	\N
2a7e44cc-729d-4fb3-99ea-8c65376d8102	b24e4934-b5ff-4004-9851-1b68185a2230	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Examen básico de matemáticas".	f	2026-05-09 19:08:27.137403+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/84be05f5-2029-435e-824a-be12ef9cf273	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	\N
425929a2-a5a2-4c9d-a64d-06db2c6689d9	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Examen básico de matemáticas".	f	2026-05-09 19:21:32.264987+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/84be05f5-2029-435e-824a-be12ef9cf273	2026-05-09 19:21:32.264987+00	\N	2026-05-09 19:21:32.264987+00	\N	04cbfec5-497a-480d-ba4d-1a08c982edb7
b396c68b-9d88-4ddd-8287-ad6bba1f6a81	ad211a41-7b76-48fb-b7ee-6506902b9809	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Examen básico de matemáticas".	f	2026-05-09 19:21:32.264987+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/84be05f5-2029-435e-824a-be12ef9cf273	2026-05-09 19:21:32.264987+00	\N	2026-05-09 19:21:32.264987+00	\N	04cbfec5-497a-480d-ba4d-1a08c982edb7
2694ced6-77b1-44a1-9691-a4e68936dc44	b24e4934-b5ff-4004-9851-1b68185a2230	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Examen básico de matemáticas".	t	2026-05-09 19:21:32.264987+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/84be05f5-2029-435e-824a-be12ef9cf273	2026-05-09 19:21:32.264987+00	\N	2026-05-10 00:48:09.681934+00	escurrablanca410@gmail.com	04cbfec5-497a-480d-ba4d-1a08c982edb7
108e2d1a-be3a-4b53-ab61-ebea43fbd10b	bf1e19fe-7735-43a4-bc82-77eb17a18139	CORRECCION	Tu tarea "Tarea – Lección 1: La oración simple" ha sido calificada. Nota: 4/4 (100%)	f	2026-05-10 03:50:29.021756+00	Tarea corregida	/tareas/976f5f12-6944-4642-9178-09fe85989113	2026-05-10 03:50:29.021756+00	escurrablanca410@gmail.com	2026-05-10 03:50:29.021756+00	escurrablanca410@gmail.com	\N
fd41ab81-28d6-4198-9fbb-500a99577d3d	ad211a41-7b76-48fb-b7ee-6506902b9809	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Evaluación Sumatoria - Lección 1".	t	2026-05-10 04:27:09.532797+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/79ca1375-2de3-4fb9-afad-ec26130f65c1	2026-05-10 04:27:09.532797+00	diazekmila@gmail.com	2026-05-12 23:20:02.074274+00	oscardmunozc@gmail.com	04cbfec5-497a-480d-ba4d-1a08c982edb7
f07e613c-ea15-4c48-acbc-f0963c7cc22d	b24e4934-b5ff-4004-9851-1b68185a2230	RECLAMO_EVALUACION	Un estudiante reclamo una correccion en "Evaluación Sumatoria - Lección 1".	t	2026-05-10 04:27:09.532797+00	Nuevo reclamo de evaluacion	/correcciones/evaluacion/79ca1375-2de3-4fb9-afad-ec26130f65c1	2026-05-10 04:27:09.532797+00	diazekmila@gmail.com	2026-05-10 04:27:53.134586+00	escurrablanca410@gmail.com	04cbfec5-497a-480d-ba4d-1a08c982edb7
799d581d-9904-4a0b-92c3-c81dd85944b8	bf1e19fe-7735-43a4-bc82-77eb17a18139	RECLAMO_EVALUACION_RESUELTO	Tu reclamo fue aceptado y la correccion fue actualizada.	t	2026-05-10 04:29:56.040102+00	Reclamo resuelto	/mis-correcciones	2026-05-10 04:29:56.040102+00	escurrablanca410@gmail.com	2026-05-10 04:30:16.183197+00	diazekmila@gmail.com	04cbfec5-497a-480d-ba4d-1a08c982edb7
85e295ac-cd91-44f4-b6db-31205bf01ad1	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Maria Benitez	f	2026-05-10 05:19:47.096394+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-10 05:19:47.096394+00	\N	2026-05-10 05:19:47.096394+00	\N	\N
1a8643fc-7c06-477a-9391-1db5025d18a7	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Maria Benitez	f	2026-05-10 05:19:47.096394+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-10 05:19:47.096394+00	\N	2026-05-10 05:19:47.096394+00	\N	\N
396efea0-7d22-4f20-9026-5b1a1b1dba51	b24e4934-b5ff-4004-9851-1b68185a2230	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Maria Benitez	f	2026-05-10 05:19:47.096394+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-10 05:19:47.096394+00	\N	2026-05-10 05:19:47.096394+00	\N	\N
cfff5648-0b01-4287-8d48-dd89b4d36461	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Maria Benitez	f	2026-05-10 05:19:47.096394+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-10 05:19:47.096394+00	\N	2026-05-10 05:19:47.096394+00	\N	\N
ca1c0f0a-2eab-4b7b-baa0-02e5164751e9	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Maria Benitez	f	2026-05-10 05:19:47.096394+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-10 05:19:47.096394+00	\N	2026-05-10 05:19:47.096394+00	\N	\N
d87f147b-ba7a-441f-b069-a876d0e432b7	718f98f7-bce2-4037-8fe2-0dd18cf63124	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	f	2026-05-10 19:26:20.573489+00	¡Cuenta aprobada!	\N	2026-05-10 19:26:20.573489+00	o.munoz.castro@gmail.com	2026-05-10 19:26:20.573489+00	o.munoz.castro@gmail.com	\N
d8cd4495-c104-4354-8ec3-292c1a5cf6bc	72b1f474-245b-42f3-89ff-eae5e6bb86e1	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	f	2026-05-10 19:27:08.855992+00	¡Cuenta aprobada!	\N	2026-05-10 19:27:08.855992+00	o.munoz.castro@gmail.com	2026-05-10 19:27:08.855992+00	o.munoz.castro@gmail.com	\N
c1ef9c8f-740e-497f-b7c8-c4e62a5f5544	c7b451e0-31ad-42c5-83d3-cc732f4a6391	usuario_aprobado	Tu cuenta ha sido aprobada. ¡Bienvenido al sistema!	f	2026-05-10 23:25:34.379881+00	¡Cuenta aprobada!	\N	2026-05-10 23:25:34.379881+00	escurrablanca410@gmail.com	2026-05-10 23:25:34.379881+00	escurrablanca410@gmail.com	\N
73c94cae-16e8-4152-98bd-b15d9cc9675b	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Gladys N	f	2026-05-12 20:58:29.344851+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N	\N
6ed74e23-ede3-42cc-bdec-f609c582c890	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Gladys N	f	2026-05-12 20:58:29.344851+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N	\N
594c5da3-65a0-45fd-b87b-729a9c46bbb9	b24e4934-b5ff-4004-9851-1b68185a2230	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Gladys N	f	2026-05-12 20:58:29.344851+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N	\N
ac8784dc-5da9-405f-b303-c7b9d8fffd5a	ad211a41-7b76-48fb-b7ee-6506902b9809	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Gladys N	f	2026-05-12 20:58:29.344851+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N	\N
5ef12c8e-5e8d-435f-b5e5-a5e4adac16ec	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	usuario_pendiente	Hay un nuevo usuario esperando aprobación: Gladys N	f	2026-05-12 20:58:29.344851+00	Nuevo usuario pendiente	/usuarios?tab=pendientes	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N	\N
74681225-4016-4f89-8daa-10a7d06de1a3	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	SOPORTE_RESUELTO	Ya se soluciono el error que reportaste en la plataforma.	t	2026-05-12 23:25:18.28519+00	Solicitud de soporte resuelta	/soporte	2026-05-12 23:25:18.28519+00	\N	2026-05-12 23:28:44.600606+00	oscardmunozc@fpuna.edu.py	04cbfec5-497a-480d-ba4d-1a08c982edb7
\.


--
-- Data for Name: preguntas_evaluacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."preguntas_evaluacion" ("id_pregunta", "id_evaluacion", "enunciado", "tipo", "puntaje", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
23636a7c-3004-4443-a0fe-f78b17f9e5b3	e51baf4d-a6b2-48c7-8353-55404d1e647c	1+1	OPCION_MULTIPLE	10.00	2026-05-01 08:55:45+00	\N	\N	\N
37fc5189-fa31-47c6-b99d-a6161f020b2e	e51baf4d-a6b2-48c7-8353-55404d1e647c	1/1 ?	OPCION_MULTIPLE	20.00	2026-05-01 08:55:45+00	\N	\N	\N
89b55a4b-7d1c-42ce-8ce7-17c169235a34	e51baf4d-a6b2-48c7-8353-55404d1e647c	cual es el primer numero primo?	ABIERTA	30.00	2026-05-01 08:55:45+00	\N	\N	\N
459a0ea0-ebc8-4fde-9e94-3f13ce2b96c8	f6129a16-3014-49e2-a603-17bf8685b4cb	cuánto vale x si: x-5=10.\n	OPCION_MULTIPLE	1.00	2026-05-01 08:55:45+00	\N	\N	\N
8302fa43-f5a8-4834-8149-37b6f6709474	f6129a16-3014-49e2-a603-17bf8685b4cb	Cuanto es la derivada de 1? y porque?	ABIERTA	2.00	2026-05-01 08:55:45+00	\N	\N	\N
7e460178-bcea-471b-b111-1ea7d17db47f	c4ce1f6b-81df-4bf3-97c0-ae652901c87d	¿Qué es una oración?	OPCION_MULTIPLE	2.00	2026-05-01 08:55:45+00	\N	\N	\N
c22682f0-8d4b-4c27-a2f4-37d944a3bbe6	c4ce1f6b-81df-4bf3-97c0-ae652901c87d	¿Cuál es el sujeto en la oración “El perro ladra”?	OPCION_MULTIPLE	1.00	2026-05-01 08:55:45+00	\N	\N	\N
a9d26cd1-09f5-4968-b19b-02e80530fa6b	c4ce1f6b-81df-4bf3-97c0-ae652901c87d	Escribir una oración simple y señalar:\nSujeto\nPredicado	ABIERTA	1.00	2026-05-01 08:55:45+00	\N	\N	\N
6f5a321f-7cd7-4582-ac57-4e9fe73c0ad2	32630eed-1739-41a9-96e9-431ca533978f	Resuelve la ecuación: \\(x^2 - 5x + 6 = 0\\)	OPCION_MULTIPLE	1.00	2026-05-01 08:55:45+00	\N	\N	\N
01a23b0a-16b3-4460-beaa-e1eb5c9f2c6d	f43b8d80-7738-4dd8-b956-6c80343cb94a	¿Qué representa un punto escrito como A(3,−2)?	OPCION_MULTIPLE	1.00	2026-05-10 03:23:11.175433+00	escurrablanca410@gmail.com	2026-05-10 03:23:11.175433+00	escurrablanca410@gmail.com
00a1df7d-748e-4054-b0b3-f25d1ce6f26a	f43b8d80-7738-4dd8-b956-6c80343cb94a	¿En qué cuadrante se encuentra el punto (−4,5)?	OPCION_MULTIPLE	1.00	2026-05-10 03:23:12.42406+00	escurrablanca410@gmail.com	2026-05-10 03:23:12.42406+00	escurrablanca410@gmail.com
e2dd5cae-e583-4c4e-93db-10f66de0b9de	f43b8d80-7738-4dd8-b956-6c80343cb94a	Hallar el punto medio entre: A(2,4) y B(6,8)	OPCION_MULTIPLE	1.00	2026-05-10 03:23:13.464772+00	escurrablanca410@gmail.com	2026-05-10 03:23:13.464772+00	escurrablanca410@gmail.com
6f4b31e3-1c5e-4456-bf47-e527944d0a70	159b98ae-58a6-4887-8760-13250bbf0c4f	¿Qué representan los ejes X e Y en el plano cartesiano?	ABIERTA	1.00	2026-05-10 23:09:21.041979+00	escurrablanca410@gmail.com	2026-05-10 23:09:21.041979+00	escurrablanca410@gmail.com
0824d171-0b7f-4261-b5ec-fe9836f3db76	4bc2b0df-eb17-4127-a952-94072d65295e	¿Cómo se llama el punto donde se cruzan el eje X y el eje Y?	OPCION_MULTIPLE	1.00	2026-05-10 23:20:37.709905+00	escurrablanca410@gmail.com	2026-05-10 23:20:37.709905+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: opciones_pregunta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."opciones_pregunta" ("id_opcion", "id_pregunta", "texto", "es_correcta", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
6bd52702-6a5d-4af3-88aa-6b69e558c4bd	23636a7c-3004-4443-a0fe-f78b17f9e5b3	2	t	2026-05-01 08:55:45+00	\N	\N	\N
31d33c6a-7328-48cc-8efa-5892be3c4a6e	23636a7c-3004-4443-a0fe-f78b17f9e5b3	1	f	2026-05-01 08:55:45+00	\N	\N	\N
23652aa6-6a6b-4fa8-a0a3-6baf2309e83a	23636a7c-3004-4443-a0fe-f78b17f9e5b3	0	f	2026-05-01 08:55:45+00	\N	\N	\N
c738e48f-1d0c-4546-a9b1-7fb3b0ee7597	37fc5189-fa31-47c6-b99d-a6161f020b2e	1	t	2026-05-01 08:55:45+00	\N	\N	\N
4dd09ae2-ee24-4cc6-97e2-4ec10586a3ee	37fc5189-fa31-47c6-b99d-a6161f020b2e	1 x 1	t	2026-05-01 08:55:45+00	\N	\N	\N
54f66d3e-b16a-474c-bbc6-9cae7104bed4	37fc5189-fa31-47c6-b99d-a6161f020b2e	0	f	2026-05-01 08:55:45+00	\N	\N	\N
4c14d246-a44a-488a-ad66-8d8e760a559f	37fc5189-fa31-47c6-b99d-a6161f020b2e	2	f	2026-05-01 08:55:45+00	\N	\N	\N
bb94ca2f-eb97-43d0-acf7-7668f35075f0	459a0ea0-ebc8-4fde-9e94-3f13ce2b96c8	10	f	2026-05-01 08:55:45+00	\N	\N	\N
18cf1c1b-c033-4bff-912a-3cbc8837dcaf	459a0ea0-ebc8-4fde-9e94-3f13ce2b96c8	15	t	2026-05-01 08:55:45+00	\N	\N	\N
fbbb8408-535b-4a87-bbba-01023cdb247e	459a0ea0-ebc8-4fde-9e94-3f13ce2b96c8	5	f	2026-05-01 08:55:45+00	\N	\N	\N
59a16533-26bc-462c-934b-6c00d414c835	459a0ea0-ebc8-4fde-9e94-3f13ce2b96c8	0	f	2026-05-01 08:55:45+00	\N	\N	\N
d925a8d6-6509-4b22-ba84-5db31b235e74	7e460178-bcea-471b-b111-1ea7d17db47f	Un conjunto de palabras sin sentido	f	2026-05-01 08:55:45+00	\N	\N	\N
e1e77eab-0aaa-4e2f-ab94-47481d177379	7e460178-bcea-471b-b111-1ea7d17db47f	Un conjunto de palabras con sentido completo	t	2026-05-01 08:55:45+00	\N	\N	\N
e5f31cec-e3cf-43c0-a1ae-62d01c841837	7e460178-bcea-471b-b111-1ea7d17db47f	Una sola palabra	f	2026-05-01 08:55:45+00	\N	\N	\N
a43625d2-b82a-4594-a976-2a7d724c9ada	c22682f0-8d4b-4c27-a2f4-37d944a3bbe6	ladra	f	2026-05-01 08:55:45+00	\N	\N	\N
a5b9ece8-4bf9-485d-8baa-fefb4ae7d813	c22682f0-8d4b-4c27-a2f4-37d944a3bbe6	el perro	t	2026-05-01 08:55:45+00	\N	\N	\N
03fe1b30-0059-4987-a0c0-996838287c49	c22682f0-8d4b-4c27-a2f4-37d944a3bbe6	perro ladra	f	2026-05-01 08:55:45+00	\N	\N	\N
0cd4630b-bb86-423c-8b80-eb350ba588f1	6f5a321f-7cd7-4582-ac57-4e9fe73c0ad2	\\(x = 2 \\text{ y } x = 3\\) 	t	2026-05-01 08:55:45+00	\N	\N	\N
8de20158-4b03-42b9-9295-e70ea91f6dce	6f5a321f-7cd7-4582-ac57-4e9fe73c0ad2	\\(x = -2 \\text{ y } x = -3\\)	f	2026-05-01 08:55:45+00	\N	\N	\N
0ea8a0e4-0294-4b29-b618-82bebc41b1ed	6f5a321f-7cd7-4582-ac57-4e9fe73c0ad2	x \n2\n −5x+6=0	f	2026-05-01 08:55:45+00	\N	\N	\N
9ababf52-3ae2-4701-9dd4-78ca71a99793	01a23b0a-16b3-4460-beaa-e1eb5c9f2c6d	Una recta	f	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com
aaf3e3c0-c5ce-4a6c-8c19-cb484e74500e	01a23b0a-16b3-4460-beaa-e1eb5c9f2c6d	Una coordenada en el plano	t	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com
b02b2b20-a4a2-4161-aaed-d86bb172eec7	01a23b0a-16b3-4460-beaa-e1eb5c9f2c6d	Un ángulo	f	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com
83373879-91c4-4c29-8197-934411f73afb	01a23b0a-16b3-4460-beaa-e1eb5c9f2c6d	Una distancia	f	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com	2026-05-10 03:23:11.782909+00	escurrablanca410@gmail.com
3598c09f-ff5c-40d1-b9b8-5c0c72ecaf8c	00a1df7d-748e-4054-b0b3-f25d1ce6f26a	1er cuadrante	f	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com
232b916d-962c-4ce8-ad03-7c9a00c725b5	00a1df7d-748e-4054-b0b3-f25d1ce6f26a	2do cuadrante	t	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com
47ad600d-48ed-4c5d-8168-313c56dc02dc	00a1df7d-748e-4054-b0b3-f25d1ce6f26a	3er cuadrante	f	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com
9a7089d9-27e3-4fe7-9a1f-0175ce10e24b	00a1df7d-748e-4054-b0b3-f25d1ce6f26a	4to cuadrante	f	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com	2026-05-10 03:23:12.916723+00	escurrablanca410@gmail.com
5fbd8e94-76b6-4685-9ef6-665e0d8463a0	e2dd5cae-e583-4c4e-93db-10f66de0b9de	(4,6)	t	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com
a1a2a1bc-0ef0-4e7b-81ff-1c1393cb8672	e2dd5cae-e583-4c4e-93db-10f66de0b9de	(8,12)	f	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com
c2b8c006-bec9-4a64-85da-c06104d850a8	e2dd5cae-e583-4c4e-93db-10f66de0b9de	(2,2)	f	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com
0f049174-63d0-4384-9c63-826693a976a1	e2dd5cae-e583-4c4e-93db-10f66de0b9de	(3,4)	f	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com	2026-05-10 03:23:13.803133+00	escurrablanca410@gmail.com
c1798ebb-b82b-4f86-9e9c-0aadec089a1b	0824d171-0b7f-4261-b5ec-fe9836f3db76	Cuadrante	f	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com
a1c4f0b1-51b4-42f9-ade8-9219c58fd42b	0824d171-0b7f-4261-b5ec-fe9836f3db76	Origen	t	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com
0a40dfdf-80c8-4d6b-8bab-7c52bc37042b	0824d171-0b7f-4261-b5ec-fe9836f3db76	Coordenada	f	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com
210161a8-efc6-49ac-adba-a2f7e7f9b9fd	0824d171-0b7f-4261-b5ec-fe9836f3db76	Recta	f	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com	2026-05-10 23:20:38.24944+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: password_reset_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."password_reset_codes" ("id", "email", "code", "expires_at", "attempts", "used", "created_at", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
b7395f14-2b27-4faa-9edd-db62730fab6c	olakasedanielxd@gmail.com	31154	2026-03-11 21:55:19.476+00	1	t	2026-03-11 21:40:19.631411+00	2026-03-11 21:40:19+00	\N	\N	\N
9314aee7-61ce-4d6c-a96b-242e2da36ec3	diazekmila@gmail.com	19276	2026-05-10 05:40:24.342+00	1	t	2026-05-10 05:25:24.959192+00	2026-05-10 05:25:24.959192+00	\N	2026-05-10 05:25:59.760066+00	\N
\.


--
-- Data for Name: progreso_lecciones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."progreso_lecciones" ("id_progreso", "id_usuario", "id_leccion", "completado", "fecha_completado", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
787d8a73-9cb6-441d-9b81-8238365fba71	addf6c0f-f231-4fde-b07f-5dac430828d9	2bf2c3db-3ab3-4ab6-a888-ee43d78276c9	t	2025-12-29 02:12:09.68+00	2025-12-29 02:12:09+00	\N	\N	\N
86618f12-c6e9-414e-a581-d5971c6364ae	addf6c0f-f231-4fde-b07f-5dac430828d9	356baf48-9b6b-4300-86b4-7ef6526637c9	t	2025-12-29 18:17:14.362+00	2025-12-29 18:17:14+00	\N	\N	\N
71a9b185-a48b-485b-8a7f-c39a6e98952f	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	0e28011e-517b-4995-82e3-aeb59ba10ee8	t	2026-04-03 04:45:47.279+00	2026-04-03 04:45:47+00	\N	\N	\N
10e82bad-87b0-454d-a18d-de4f2a3946d0	bf1e19fe-7735-43a4-bc82-77eb17a18139	06f89e2b-6e9c-44e4-b2c9-715f636bf18f	t	2026-05-10 05:26:50.842+00	2026-05-10 05:26:51.671474+00	diazekmila@gmail.com	2026-05-10 05:26:51.671474+00	diazekmila@gmail.com
b46a13f9-fcdf-4099-8151-0df724c79556	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	d2ec3745-29af-44ed-8d64-cb25c12468c8	t	2026-05-10 18:27:42.612+00	2026-05-10 18:27:42.756946+00	oscardmunozc@fpuna.edu.py	2026-05-10 18:27:42.756946+00	oscardmunozc@fpuna.edu.py
\.


--
-- Data for Name: respuestas_intento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."respuestas_intento" ("id_respuesta", "id_intento", "id_pregunta", "id_opcion", "respuesta_texto", "es_correcta", "puntaje_obtenido", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
a67474f4-0068-4f99-b433-4934070a265f	84be05f5-2029-435e-824a-be12ef9cf273	459a0ea0-ebc8-4fde-9e94-3f13ce2b96c8	18cf1c1b-c033-4bff-912a-3cbc8837dcaf	\N	t	1.00	2026-05-01 08:55:45+00	\N	\N	\N
0d76ea4f-ed85-4f5b-8ccd-6d8fd45dad3e	84be05f5-2029-435e-824a-be12ef9cf273	8302fa43-f5a8-4834-8149-37b6f6709474	\N	La derivada es 0 pero no se porque	t	1.00	2026-05-01 08:55:45+00	\N	\N	\N
74f60df1-4143-4f18-b3d7-ed52d2693a7c	46b5c516-e8c9-4694-8152-d34eb78abf55	89b55a4b-7d1c-42ce-8ce7-17c169235a34	\N	1 es el primero	\N	0.00	2026-05-01 08:55:45+00	\N	\N	\N
b0aad5f2-c54a-4b5d-8ba3-2c6d6c4762af	46b5c516-e8c9-4694-8152-d34eb78abf55	23636a7c-3004-4443-a0fe-f78b17f9e5b3	31d33c6a-7328-48cc-8efa-5892be3c4a6e	\N	f	0.00	2026-05-01 08:55:45+00	\N	\N	\N
62c1c6b8-fa98-458e-9638-ef53b7740103	46b5c516-e8c9-4694-8152-d34eb78abf55	37fc5189-fa31-47c6-b99d-a6161f020b2e	c738e48f-1d0c-4546-a9b1-7fb3b0ee7597	\N	t	20.00	2026-05-01 08:55:45+00	\N	\N	\N
3eb9471d-e551-44f1-86d8-113ed3203e48	79ca1375-2de3-4fb9-afad-ec26130f65c1	7e460178-bcea-471b-b111-1ea7d17db47f	e1e77eab-0aaa-4e2f-ab94-47481d177379	\N	t	2.00	2026-05-01 08:55:45+00	\N	2026-05-10 04:29:53.049074+00	escurrablanca410@gmail.com
4ff83cd0-b67a-4be3-b9e1-386881725542	79ca1375-2de3-4fb9-afad-ec26130f65c1	c22682f0-8d4b-4c27-a2f4-37d944a3bbe6	a43625d2-b82a-4594-a976-2a7d724c9ada	\N	f	1.00	2026-05-01 08:55:45+00	\N	2026-05-10 04:29:53.810738+00	escurrablanca410@gmail.com
48b12b8d-8714-42c8-a8f1-c6edeeb5e1a0	8576dea7-1679-48bb-86eb-98147186835e	01a23b0a-16b3-4460-beaa-e1eb5c9f2c6d	aaf3e3c0-c5ce-4a6c-8c19-cb484e74500e	\N	t	1.00	2026-05-10 04:32:13.263341+00	diazekmila@gmail.com	2026-05-10 18:16:48.970157+00	diazekmila@gmail.com
506fb7a0-6165-441a-815b-cb5518e6923a	8576dea7-1679-48bb-86eb-98147186835e	00a1df7d-748e-4054-b0b3-f25d1ce6f26a	47ad600d-48ed-4c5d-8168-313c56dc02dc	\N	f	0.00	2026-05-10 04:32:06.291882+00	diazekmila@gmail.com	2026-05-10 18:16:48.970157+00	diazekmila@gmail.com
26208471-4ec7-4d56-ba2c-690cb3cf7e87	8576dea7-1679-48bb-86eb-98147186835e	e2dd5cae-e583-4c4e-93db-10f66de0b9de	5fbd8e94-76b6-4685-9ef6-665e0d8463a0	\N	t	1.00	2026-05-10 04:32:32.17432+00	diazekmila@gmail.com	2026-05-10 18:16:48.970157+00	diazekmila@gmail.com
c47c5bbe-a491-4b14-9ba2-d681741274bf	51eed741-6f38-4f7d-98dc-737a5efd77b5	a9d26cd1-09f5-4968-b19b-02e80530fa6b	\N	prueba	\N	0.00	2026-05-10 18:25:43.343926+00	oscardmunozc@fpuna.edu.py	2026-05-10 18:25:45.975579+00	oscardmunozc@fpuna.edu.py
7e81e9d2-bd96-4aab-842a-a8a3557b5473	51eed741-6f38-4f7d-98dc-737a5efd77b5	7e460178-bcea-471b-b111-1ea7d17db47f	e1e77eab-0aaa-4e2f-ab94-47481d177379	\N	t	2.00	2026-05-10 18:25:36.623107+00	oscardmunozc@fpuna.edu.py	2026-05-10 18:26:12.101345+00	oscardmunozc@fpuna.edu.py
a7cbea85-0528-4ef8-bc59-f5462c2066c4	51eed741-6f38-4f7d-98dc-737a5efd77b5	c22682f0-8d4b-4c27-a2f4-37d944a3bbe6	a5b9ece8-4bf9-485d-8baa-fefb4ae7d813	\N	t	1.00	2026-05-10 18:25:51.8534+00	oscardmunozc@fpuna.edu.py	2026-05-10 18:26:12.101345+00	oscardmunozc@fpuna.edu.py
3551b87d-b67b-4124-92bc-60614677348b	b29946b0-2336-463c-9e94-9e9a8dbe267c	0824d171-0b7f-4261-b5ec-fe9836f3db76	a1c4f0b1-51b4-42f9-ade8-9219c58fd42b	\N	t	1.00	2026-05-10 23:21:32.268693+00	diazekmila@gmail.com	2026-05-10 23:21:39.548242+00	diazekmila@gmail.com
\.


--
-- Data for Name: reclamos_evaluacion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."reclamos_evaluacion" ("id_reclamo", "id_intento", "id_respuesta", "id_estudiante", "justificacion", "estado", "puntaje_original", "puntaje_resuelto", "respuesta_docente", "id_docente_resolutor", "fecha_reclamo", "fecha_resolucion", "fec_insercion", "fec_modificacion", "usu_insercion", "usu_modificacion") FROM stdin;
31ce9c46-806d-4c36-b326-c7fa0a442b64	84be05f5-2029-435e-824a-be12ef9cf273	0d76ea4f-ed85-4f5b-8ccd-6d8fd45dad3e	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	Porfa, conciderame el punto que falta.	PENDIENTE	1.00	\N	\N	\N	2026-05-09 19:08:27.137403+00	\N	2026-05-09 19:08:27.137403+00	2026-05-09 19:08:27.137403+00	oscardmunozc@fpuna.edu.py	oscardmunozc@fpuna.edu.py
df8aca3c-31d9-44f4-b624-e70ff1aaaedf	79ca1375-2de3-4fb9-afad-ec26130f65c1	4ff83cd0-b67a-4be3-b9e1-386881725542	bf1e19fe-7735-43a4-bc82-77eb17a18139	Podrias reconsiderar esto?	ACEPTADO	0.00	1.00	Dale, te considero en este intento	b24e4934-b5ff-4004-9851-1b68185a2230	2026-05-10 04:27:09.532797+00	2026-05-10 04:29:56.040102+00	2026-05-10 04:27:09.532797+00	2026-05-10 04:29:56.040102+00	diazekmila@gmail.com	escurrablanca410@gmail.com
\.


--
-- Data for Name: retroalimentacion_intento; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."retroalimentacion_intento" ("id_retro", "id_intento", "id_docente", "comentario", "ajuste_puntaje", "fecha_retro", "archivo_url", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
2c13190a-e240-42f8-8391-a75945818669	84be05f5-2029-435e-824a-be12ef9cf273	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	Referente a la pregunta 2, respondiste pero no mencionaste el porque, por eso no llevas los dos puntos del ejercicio.  Esta seria la respuesta correcta : {La derivada de 1 (y de cualquier constante) es 0 Esto se debe a que la derivada representa la tasa de cambio de una función; como el número 1 es una constante y no cambia, su tasa de cambio es nula. }	0.00	2026-04-03 19:55:47.089+00	\N	2026-04-03 19:55:47+00	\N	\N	\N
87b9efa5-da50-46a8-b420-8cf23c8da82e	79ca1375-2de3-4fb9-afad-ec26130f65c1	b24e4934-b5ff-4004-9851-1b68185a2230	Incompleto los items	0.00	2026-05-10 04:29:54.522+00	\N	2026-04-26 22:29:45+00	\N	2026-05-10 04:29:55.282829+00	escurrablanca410@gmail.com
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."roles" ("id_rol", "nombre_rol", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
1	ADMINISTRADOR	2026-05-01 08:55:45+00	\N	\N	\N
2	DOCENTE	2026-05-01 08:55:45+00	\N	\N	\N
3	ESTUDIANTE	2026-05-01 08:55:45+00	\N	\N	\N
\.


--
-- Data for Name: soporte_solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."soporte_solicitudes" ("id_solicitud", "id_cursillo", "id_usuario", "nombre_usuario", "telefono", "tipo_solicitud", "descripcion", "imagen_bucket", "imagen_path", "imagen_nombre", "imagen_tipo_mime", "imagen_tamano_bytes", "estado", "email_notificado", "fecha_email_notificado", "fecha_solicitud", "fec_insercion", "fec_modificacion", "usu_insercion", "usu_modificacion", "fecha_resolucion", "id_admin_resolutor", "resolucion_notificada", "fecha_resolucion_notificada", "resolucion_email_notificado", "fecha_resolucion_email_notificado") FROM stdin;
95510af9-bcd0-4f5f-9398-28b754b841a0	04cbfec5-497a-480d-ba4d-1a08c982edb7	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	Daniel Muñoz	098112346	ERROR	Me apareció un error al intentar entregar mi evaluación en la lección X del Curso Z.	soporte_evidencias	d955d71c-a9ef-48ff-aa40-d4c87527a9a8/765aed01-3f36-4a03-97c9-9d22345d40b4.png	imagendeprueba.png	image/png	3519	RESUELTO	t	2026-05-12 23:13:34.188+00	2026-05-12 23:13:28.270868+00	2026-05-12 23:13:28.270868+00	2026-05-12 23:25:19.100323+00	oscardmunozc@fpuna.edu.py	oscardmunozc@gmail.com	2026-05-12 23:25:18.148+00	ad211a41-7b76-48fb-b7ee-6506902b9809	t	2026-05-12 23:25:18.148+00	t	2026-05-12 23:25:18.148+00
\.


--
-- Data for Name: usuarios_cursillos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."usuarios_cursillos" ("id_usuario_cursillo", "id_usuario", "id_cursillo", "id_rol", "fecha_asignacion", "estado", "fec_insercion", "usu_insercion", "fec_modificacion", "usu_modificacion") FROM stdin;
5d27ca7a-b692-4721-b1be-31eb2726b8cd	ad211a41-7b76-48fb-b7ee-6506902b9809	04cbfec5-497a-480d-ba4d-1a08c982edb7	1	2025-12-18 02:06:11.889746+00	ACTIVO	2025-12-18 02:06:11+00	\N	\N	\N
57aecc70-63b5-4e9b-8da4-8c5757ad40b0	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	04cbfec5-497a-480d-ba4d-1a08c982edb7	2	2025-12-18 14:18:21.156913+00	ACTIVO	2025-12-18 14:18:21+00	\N	\N	\N
bf7f589f-5485-4977-a670-b49a269b716a	addf6c0f-f231-4fde-b07f-5dac430828d9	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2025-12-18 14:21:33.18164+00	ACTIVO	2025-12-18 14:21:33+00	\N	\N	\N
452af82a-0991-4b23-9bd1-023efe94e6ff	9924dff0-d5cf-4600-acaa-62ac57871897	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-01-04 05:01:11.300249+00	ACTIVO	2026-01-04 05:01:11+00	\N	\N	\N
5a0d240b-960f-4898-9287-c5f65122541f	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-03-15 22:23:59.358822+00	ACTIVO	2026-03-15 22:23:59+00	\N	\N	\N
30459f61-7e51-40cb-8196-39ea6381b378	d87a519d-6158-4aa0-bb70-aa107b3c91ef	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2025-12-20 02:49:48.856617+00	BLOQUEADO	2025-12-20 02:49:48+00	\N	\N	\N
85cb1061-1f03-4e2f-8680-0d797f5c5a55	bf1e19fe-7735-43a4-bc82-77eb17a18139	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-04-26 16:01:08.213453+00	ACTIVO	2026-04-26 16:01:08+00	\N	\N	\N
bf2f97dd-96e4-4301-9f54-555d7c7a2f76	b24e4934-b5ff-4004-9851-1b68185a2230	04cbfec5-497a-480d-ba4d-1a08c982edb7	2	2026-04-26 16:22:01.732896+00	ACTIVO	2026-04-26 16:22:01+00	\N	\N	\N
b00fa5e3-f3c1-4e83-b4e4-b1728fd3ba0d	ad211a41-7b76-48fb-b7ee-6506902b9809	e20d7cc7-c724-4132-a0dc-df61bf35d9b1	1	2026-05-09 00:34:47.814657+00	ACTIVO	2026-05-09 00:34:47.814657+00	\N	2026-05-09 00:34:47.814657+00	\N
b0af1a92-2ef3-4fda-a93c-5c692fc45b3c	04dbb21b-b1cc-46b6-a2e6-75a6b85242c2	e20d7cc7-c724-4132-a0dc-df61bf35d9b1	2	2026-05-09 15:31:57.977189+00	ACTIVO	2026-05-09 15:31:57.977189+00	\N	2026-05-09 15:31:57.977189+00	\N
0bed95cb-6d62-4c88-81a9-7da745281db7	d955d71c-a9ef-48ff-aa40-d4c87527a9a8	e20d7cc7-c724-4132-a0dc-df61bf35d9b1	3	2026-05-09 15:31:57.977189+00	ACTIVO	2026-05-09 15:31:57.977189+00	\N	2026-05-09 15:31:57.977189+00	\N
c5efb139-07e2-4206-ac47-c0c289bc368a	718f98f7-bce2-4037-8fe2-0dd18cf63124	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-05-10 05:19:47.096394+00	ACTIVO	2026-05-10 05:19:47.096394+00	\N	2026-05-10 19:26:20.573489+00	o.munoz.castro@gmail.com
6b4fa799-769f-4884-81f0-413207daa682	72b1f474-245b-42f3-89ff-eae5e6bb86e1	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-05-03 19:52:02.124104+00	ACTIVO	2026-05-03 19:52:02.124104+00	\N	2026-05-10 19:27:08.855992+00	o.munoz.castro@gmail.com
01ebff1d-277c-4198-beea-4f263f15945d	c7b451e0-31ad-42c5-83d3-cc732f4a6391	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-01-12 02:59:12.738743+00	ACTIVO	2026-01-12 02:59:12+00	\N	2026-05-10 23:25:34.379881+00	escurrablanca410@gmail.com
fce3ed8c-dc1f-45f7-b807-cd4648c0f0d4	939e1ed8-51e3-4762-96ac-c3294e793c0f	04cbfec5-497a-480d-ba4d-1a08c982edb7	3	2026-05-12 20:58:29.344851+00	PENDIENTE	2026-05-12 20:58:29.344851+00	\N	2026-05-12 20:58:29.344851+00	\N
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
archivos_tareas	archivos_tareas	\N	2025-12-18 01:11:42.997229+00	2025-12-18 01:11:42.997229+00	f	f	\N	\N	\N	STANDARD
contenido_lecciones	contenido_lecciones	\N	2025-12-23 04:16:46.118555+00	2025-12-23 04:16:46.118555+00	t	f	\N	\N	\N	STANDARD
avatars	avatars	\N	2026-01-13 04:03:11.054702+00	2026-01-13 04:03:11.054702+00	t	f	\N	\N	\N	STANDARD
soporte_evidencias	soporte_evidencias	\N	2026-05-12 21:46:10.018065+00	2026-05-12 21:46:10.018065+00	f	f	5242880	{image/jpeg,image/png,image/webp}	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
b9bd791d-9ecf-4afe-b83a-032bf26b6348	contenido_lecciones	adjuntos/2bf2c3db-3ab3-4ab6-a888-ee43d78276c9/1766464247882_7akiuj.jpg	f7e04a5c-ec80-457d-995c-137d8fad9cc9	2025-12-23 04:30:51.260261+00	2025-12-23 04:30:51.260261+00	2025-12-23 04:30:51.260261+00	{"eTag": "\\"979b2a010b6cf3af4c674479dbace6c8\\"", "size": 2698847, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-23T04:30:52.000Z", "contentLength": 2698847, "httpStatusCode": 200}	7905af30-60a5-4339-95a1-27e7af51a313	f7e04a5c-ec80-457d-995c-137d8fad9cc9	{}
e5ddc2e6-eb0b-4cf4-a168-ac0f6f3dadd5	contenido_lecciones	pdfs/1766894592701_76vu7f.pdf	f7e04a5c-ec80-457d-995c-137d8fad9cc9	2025-12-28 04:03:14.648958+00	2025-12-28 04:03:14.648958+00	2025-12-28 04:03:14.648958+00	{"eTag": "\\"ac5f7a8e4bf5b06ac76c947791c5e9b1\\"", "size": 1030423, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2025-12-28T04:03:15.000Z", "contentLength": 1030423, "httpStatusCode": 200}	8a1df449-fa8b-4720-a866-9bd298b068de	f7e04a5c-ec80-457d-995c-137d8fad9cc9	{}
61311946-fa81-4648-bc9f-eb13435dac12	contenido_lecciones	adjuntos/a812d7ae-2b93-4d78-b9f4-cbec487df59a/1766896575122_dtqll.pdf	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	2025-12-28 04:36:18.393607+00	2025-12-28 04:36:18.393607+00	2025-12-28 04:36:18.393607+00	{"eTag": "\\"7c4b92b994cdc690551524d0fc8c2432\\"", "size": 2978600, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2025-12-28T04:36:19.000Z", "contentLength": 2978600, "httpStatusCode": 200}	8ab8a13d-de11-42a0-a953-fe47ae268fda	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	{}
ec1485b7-d47b-48a2-b12c-36cf20fd942e	archivos_tareas	55b10fa7-a5b8-4536-94be-c3dd9de3d326/fbf4ce42-d64e-4472-9c67-858adc42160e/cf8c5b51-e820-4c88-9de3-60dead74dde1.jpg	55b10fa7-a5b8-4536-94be-c3dd9de3d326	2025-12-30 01:53:44.190101+00	2025-12-30 01:53:44.190101+00	2025-12-30 01:53:44.190101+00	{"eTag": "\\"4b4bb29b5d71dea06e01bb2620259898\\"", "size": 18712, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2025-12-30T01:53:45.000Z", "contentLength": 18712, "httpStatusCode": 200}	c053e3da-a76c-47d8-9c0a-cd408a2418b2	55b10fa7-a5b8-4536-94be-c3dd9de3d326	{}
8eff3c81-dae0-4d2a-9d62-6c69e5ee45ec	avatars	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2/avatar.jpg	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	2026-01-13 04:05:59.363947+00	2026-01-13 04:05:59.363947+00	2026-01-13 04:05:59.363947+00	{"eTag": "\\"ff8e93461e62689b29f6806f4a350aca\\"", "size": 119098, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-01-13T04:06:00.000Z", "contentLength": 119098, "httpStatusCode": 200}	06c4674a-9676-43f5-81de-704bc9759f6b	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	{}
161f3b1e-6214-415d-95a6-7512eb5797aa	contenido_lecciones	adjuntos/4b3b9bd5-a207-43b3-a71a-18ee7a1069c4/1774219546281_xdk17.png	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	2026-03-22 22:45:46.675764+00	2026-03-22 22:45:46.675764+00	2026-03-22 22:45:46.675764+00	{"eTag": "\\"a348b40a28e531b2fc030bb397e16850\\"", "size": 32276, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-03-22T22:45:47.000Z", "contentLength": 32276, "httpStatusCode": 200}	2acba5f4-25d1-43a2-b4e3-25682dfe5bb1	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	{}
2b1b27ca-3d67-4a3a-b405-2196edb534ca	contenido_lecciones	pdfs/1776605598940_bva1kb.pdf	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	2026-04-19 13:33:20.972457+00	2026-04-19 13:33:20.972457+00	2026-04-19 13:33:20.972457+00	{"eTag": "\\"f6ed166894475d7d5633bff2bce291b9\\"", "size": 615925, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-04-19T13:33:21.000Z", "contentLength": 615925, "httpStatusCode": 200}	566b91aa-bf3c-47c2-b97d-975444844c7e	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	{}
32ac6164-afae-4735-abf4-50b742113ca4	archivos_tareas	31c2ebbb-ee74-449f-88b3-c6d250604a44/0fdd0df4-10f5-4ca7-879d-bdbc41acb69c/um1fuia67xnmo63uhhf.pdf	31c2ebbb-ee74-449f-88b3-c6d250604a44	2026-04-19 18:34:07.287251+00	2026-04-19 18:34:07.287251+00	2026-04-19 18:34:07.287251+00	{"eTag": "\\"fbd12b885113959cc3c71a120692a5d0\\"", "size": 4684870, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-04-19T18:34:08.000Z", "contentLength": 4684870, "httpStatusCode": 200}	a4d2cbba-8737-4c6b-abc4-11d1c0bf74a7	31c2ebbb-ee74-449f-88b3-c6d250604a44	{}
8a2c7cc6-d376-4eae-aa06-6e5136b7d6d8	archivos_tareas	retroalimentacion_tareas/0fdd0df4-10f5-4ca7-879d-bdbc41acb69c/docente_1776629140431.jpeg	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	2026-04-19 20:05:41.59399+00	2026-04-19 20:05:41.59399+00	2026-04-19 20:05:41.59399+00	{"eTag": "\\"b515d0d5f8b17ca54e5f8cc7850eb362\\"", "size": 120162, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-04-19T20:05:42.000Z", "contentLength": 120162, "httpStatusCode": 200}	07cb3b18-eab1-4e6a-9bff-006c4e456e35	9f5d7b35-87fa-4ca3-9a56-b5d4daccc2f2	{}
0318fc2e-392c-46d6-a5a6-48b95ddefc8d	contenido_lecciones	pdfs/1777825909172_r23tx9.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-03 16:32:01.535493+00	2026-05-03 16:32:01.535493+00	2026-05-03 16:32:01.535493+00	{"eTag": "\\"943f92d55424621dd317dbdfea3f8f98\\"", "size": 2554, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-03T16:32:02.000Z", "contentLength": 2554, "httpStatusCode": 200}	a99a32b8-3434-44f2-8c8c-427c267503e8	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
2b57f3a8-40fb-48ce-bbad-555185ae66ec	contenido_lecciones	adjuntos/d0144e86-2d95-4cb1-86ab-6f6fe2f96997/1777826113887_efbiy.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-03 16:35:19.094829+00	2026-05-03 16:35:19.094829+00	2026-05-03 16:35:19.094829+00	{"eTag": "\\"e6d15ef697407cdc4bf06e5b46286325\\"", "size": 2386, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-03T16:35:20.000Z", "contentLength": 2386, "httpStatusCode": 200}	cb06ec7f-b7cd-4229-a00a-6783d6c99b6f	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
4f1e584a-3a25-473c-93c0-f4e54cda0df8	avatars	79a0830b-145c-4e91-a21e-dcccb3bbdc21/avatar.jpg	79a0830b-145c-4e91-a21e-dcccb3bbdc21	2026-05-03 19:49:07.048838+00	2026-05-03 19:49:07.048838+00	2026-05-03 19:49:07.048838+00	{"eTag": "\\"4b316bde3bd4c5f326f08b2247118b8b\\"", "size": 17464, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-03T19:49:08.000Z", "contentLength": 17464, "httpStatusCode": 200}	d44c172e-f25c-42ee-86e5-47c03c3447b7	79a0830b-145c-4e91-a21e-dcccb3bbdc21	{}
a9c93f64-3b15-4ee2-8fbb-6490a6b3613e	contenido_lecciones	pdfs/1778377979968_okhle.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-10 01:53:07.368137+00	2026-05-10 01:53:07.368137+00	2026-05-10 01:53:07.368137+00	{"eTag": "\\"71ffc72fcb4189456d042978d4f7091e\\"", "size": 3924, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-10T01:53:08.000Z", "contentLength": 3924, "httpStatusCode": 200}	9a124cae-e9bc-4443-8fc4-d307d23ff811	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
7b700883-fdd7-4365-bda2-1812ac5912af	contenido_lecciones	pdfs/1778381921882_0jkxw7.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-10 02:58:42.751218+00	2026-05-10 02:58:42.751218+00	2026-05-10 02:58:42.751218+00	{"eTag": "\\"71ffc72fcb4189456d042978d4f7091e\\"", "size": 3924, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-10T02:58:43.000Z", "contentLength": 3924, "httpStatusCode": 200}	1b43acba-e06c-4847-983c-8bf7a2fc62f9	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
5d10d909-f8f8-4021-82a6-2c2bd9f0a392	archivos_tareas	retroalimentacion_tareas/60225811-eeed-4b8e-8edd-9d4078072cb6/docente_1778385072230.jpg	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-10 03:51:13.782385+00	2026-05-10 03:51:13.782385+00	2026-05-10 03:51:13.782385+00	{"eTag": "\\"4b316bde3bd4c5f326f08b2247118b8b\\"", "size": 17464, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-10T03:51:14.000Z", "contentLength": 17464, "httpStatusCode": 200}	16a8ce79-2cf6-4512-be6d-84d58d5048b3	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
3f3bbc68-527d-45ed-b2ae-2b2eb8004b9d	contenido_lecciones	pdfs/1778388844887_n0aflz.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-10 04:54:06.285103+00	2026-05-10 04:54:06.285103+00	2026-05-10 04:54:06.285103+00	{"eTag": "\\"71ffc72fcb4189456d042978d4f7091e\\"", "size": 3924, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-10T04:54:07.000Z", "contentLength": 3924, "httpStatusCode": 200}	2864287d-8cae-4ad7-9f36-e312e77b3123	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
2c56a754-d9dd-4c8c-9f2c-4a3ebfcd407c	contenido_lecciones	pdfs/1778454859155_i2kuo.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-10 23:14:20.569408+00	2026-05-10 23:14:20.569408+00	2026-05-10 23:14:20.569408+00	{"eTag": "\\"a0a24e5fcc74b02752aa6cceed351344\\"", "size": 72213, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-10T23:14:21.000Z", "contentLength": 72213, "httpStatusCode": 200}	8103024f-05fb-46a4-81eb-10a7c465c210	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
ddbe058f-f741-4ca0-be78-45325de831e3	contenido_lecciones	pdfs/1778454904059_pf5z7.pdf	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	2026-05-10 23:15:05.541818+00	2026-05-10 23:15:05.541818+00	2026-05-10 23:15:05.541818+00	{"eTag": "\\"a0a24e5fcc74b02752aa6cceed351344\\"", "size": 72213, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-10T23:15:06.000Z", "contentLength": 72213, "httpStatusCode": 200}	70ad52cb-6217-4d39-9d4d-5f2dde6ec801	c05e1f02-f66e-43f9-90bf-9f6ffcde5dfe	{}
94cb4d74-5af2-49bf-981e-9a7803875885	soporte_evidencias	d955d71c-a9ef-48ff-aa40-d4c87527a9a8/79dbd807-2105-49c7-a97b-f320b8aab4ad.png	31c2ebbb-ee74-449f-88b3-c6d250604a44	2026-05-12 22:47:05.151992+00	2026-05-12 22:47:05.151992+00	2026-05-12 22:47:05.151992+00	{"eTag": "\\"a08136434e46f4b8b7064b31de1da5dc\\"", "size": 3519, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-12T22:47:06.000Z", "contentLength": 3519, "httpStatusCode": 200}	65086939-322c-4092-8009-c1da14e8a62a	31c2ebbb-ee74-449f-88b3-c6d250604a44	{}
30eb6303-559f-49a9-8372-88f653a3056f	soporte_evidencias	d955d71c-a9ef-48ff-aa40-d4c87527a9a8/313b24b4-a055-42cb-8663-6973196b287c.png	31c2ebbb-ee74-449f-88b3-c6d250604a44	2026-05-12 22:47:22.360571+00	2026-05-12 22:47:22.360571+00	2026-05-12 22:47:22.360571+00	{"eTag": "\\"a08136434e46f4b8b7064b31de1da5dc\\"", "size": 3519, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-12T22:47:23.000Z", "contentLength": 3519, "httpStatusCode": 200}	468b1bdb-207c-4cd7-8d1e-b13c3c410a7c	31c2ebbb-ee74-449f-88b3-c6d250604a44	{}
4bae07e5-cbf5-4202-9ab3-a80f0cb067ac	soporte_evidencias	d955d71c-a9ef-48ff-aa40-d4c87527a9a8/765aed01-3f36-4a03-97c9-9d22345d40b4.png	31c2ebbb-ee74-449f-88b3-c6d250604a44	2026-05-12 23:13:27.583727+00	2026-05-12 23:13:27.583727+00	2026-05-12 23:13:27.583727+00	{"eTag": "\\"a08136434e46f4b8b7064b31de1da5dc\\"", "size": 3519, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-12T23:13:28.000Z", "contentLength": 3519, "httpStatusCode": 200}	fa2da345-7852-49eb-b00c-5bea180c46dc	31c2ebbb-ee74-449f-88b3-c6d250604a44	{}
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 587, true);


--
-- Name: grupos_cursos_orden_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."grupos_cursos_orden_seq"', 1, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 1cyv43yND99M5FglkzZWp1vrP8TNHZFUiuoZFOnFEwWU9y4AYiYVvHulYwbsBox

RESET ALL;
