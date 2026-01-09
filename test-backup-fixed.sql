SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ykFBhAidCMMJtZwbmho7cVGsK3wZmxeyKPC7orPplL9zPeAS2p6f2aXo93ToBHm

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



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', 'authenticated', 'authenticated', 'admin@example.com', '$2a$06$jiQx.U2WrL4pKAsiEETSNuqB8qLNjvUPp/VaVismkYrYdZfCSjjcm', '2026-01-09 00:16:34.44533+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-01-09 04:19:39.07386+00', '{"provider": "email", "providers": ["email"]}', '{}', NULL, '2026-01-09 00:16:34.44533+00', '2026-01-09 07:16:16.535165+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 'authenticated', 'authenticated', '0988597052@temp.local', '$2a$10$f7NeCHX./7NSyarkMCZHUO/PkYWAcle9gd0rgo4Euh6aQwzRVFv3O', '2026-01-09 07:25:04.706975+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-01-09 07:35:56.794629+00', '{"provider": "email", "providers": ["email"]}', '{"role": "client", "phone": "0988597052", "email_verified": true}', NULL, '2026-01-09 07:25:04.658295+00', '2026-01-09 07:35:56.836201+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', '{"sub": "ccb907fc-4cc5-4b7d-90d5-2e41325bf592", "email": "0988597052@temp.local", "email_verified": false, "phone_verified": false}', 'email', '2026-01-09 07:25:04.690973+00', '2026-01-09 07:25:04.691039+00', '2026-01-09 07:25:04.691039+00', '4edf20f2-e520-4ac6-bedd-6d6dc6c5fe75');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('1e8c65ee-b20e-4474-9cf0-eac93dbb802d', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', '2026-01-09 00:17:14.776407+00', '2026-01-09 01:53:07.011154+00', NULL, 'aal1', NULL, '2026-01-09 01:53:07.011029', 'Vercel Edge Functions', '13.57.194.170', NULL, NULL, NULL, NULL, NULL),
	('fb373adb-bd16-4258-b9bd-09be405dcfc0', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', '2026-01-09 04:19:39.073989+00', '2026-01-09 07:16:47.342589+00', NULL, 'aal1', NULL, '2026-01-09 07:16:47.342484', 'node', '114.47.65.45', NULL, NULL, NULL, NULL, NULL),
	('2ed1a194-b4fa-4b7b-a480-58ad2c8af05b', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', '2026-01-09 07:25:16.740771+00', '2026-01-09 07:25:16.740771+00', NULL, 'aal1', NULL, NULL, 'node', '13.212.203.218', NULL, NULL, NULL, NULL, NULL),
	('be7f9688-0afe-4c9e-9eed-93dd98cd3905', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', '2026-01-09 07:35:56.794733+00', '2026-01-09 07:35:56.794733+00', NULL, 'aal1', NULL, NULL, 'node', '114.47.65.45', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('1e8c65ee-b20e-4474-9cf0-eac93dbb802d', '2026-01-09 00:17:14.804222+00', '2026-01-09 00:17:14.804222+00', 'password', '5ff018a7-3e88-476d-8014-d694269ce25d'),
	('fb373adb-bd16-4258-b9bd-09be405dcfc0', '2026-01-09 04:19:39.133251+00', '2026-01-09 04:19:39.133251+00', 'password', 'e230d93d-bf27-462b-b175-92a097b68b47'),
	('2ed1a194-b4fa-4b7b-a480-58ad2c8af05b', '2026-01-09 07:25:16.762283+00', '2026-01-09 07:25:16.762283+00', 'password', '25ca9da1-720d-4f43-b8da-c2bf61732c53'),
	('be7f9688-0afe-4c9e-9eed-93dd98cd3905', '2026-01-09 07:35:56.841381+00', '2026-01-09 07:35:56.841381+00', 'password', '78395f8b-32c3-421c-8ca8-12df9f4ba60e');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 46, 'dcggoobvyn7f', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', true, '2026-01-09 00:17:14.795106+00', '2026-01-09 01:53:06.948724+00', NULL, '1e8c65ee-b20e-4474-9cf0-eac93dbb802d'),
	('00000000-0000-0000-0000-000000000000', 47, '3x42urbkxrn6', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', false, '2026-01-09 01:53:06.977047+00', '2026-01-09 01:53:06.977047+00', 'dcggoobvyn7f', '1e8c65ee-b20e-4474-9cf0-eac93dbb802d'),
	('00000000-0000-0000-0000-000000000000', 48, '3hxkfgrvj2kb', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', true, '2026-01-09 04:19:39.118001+00', '2026-01-09 05:18:14.902827+00', NULL, 'fb373adb-bd16-4258-b9bd-09be405dcfc0'),
	('00000000-0000-0000-0000-000000000000', 49, 'wfcqnvq3cy4c', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', true, '2026-01-09 05:18:14.919344+00', '2026-01-09 06:17:43.306345+00', '3hxkfgrvj2kb', 'fb373adb-bd16-4258-b9bd-09be405dcfc0'),
	('00000000-0000-0000-0000-000000000000', 50, 'tngqgakivkcf', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', true, '2026-01-09 06:17:43.329788+00', '2026-01-09 07:16:16.515803+00', 'wfcqnvq3cy4c', 'fb373adb-bd16-4258-b9bd-09be405dcfc0'),
	('00000000-0000-0000-0000-000000000000', 51, 'gxdhia2gn2br', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', false, '2026-01-09 07:16:16.52843+00', '2026-01-09 07:16:16.52843+00', 'tngqgakivkcf', 'fb373adb-bd16-4258-b9bd-09be405dcfc0'),
	('00000000-0000-0000-0000-000000000000', 52, 'cve7waicywqr', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', false, '2026-01-09 07:25:16.754639+00', '2026-01-09 07:25:16.754639+00', NULL, '2ed1a194-b4fa-4b7b-a480-58ad2c8af05b'),
	('00000000-0000-0000-0000-000000000000', 53, 'lipx4ize3vzm', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', false, '2026-01-09 07:35:56.817244+00', '2026-01-09 07:35:56.817244+00', NULL, 'be7f9688-0afe-4c9e-9eed-93dd98cd3905');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."audit_logs" ("id", "target_type", "target_id", "action_type", "actor_id", "actor_role", "actor_display_name", "old_values", "new_values", "notes", "created_at") VALUES
	('9b46ae5d-26d8-4ac2-8054-0f4f11c733c1', 'client', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 'created', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', 'admin', 'admin', NULL, '{"phone": "0988597052", "tier_id": "e6b7cb92-8353-44b2-afdc-78e205f562fe", "display_name": "哈雷"}', NULL, '2026-01-09 07:25:05.631193+00'),
	('d1e2ded4-d2d5-4970-8a62-411fe0109404', 'product', '6fc567a8-9a58-42be-b07b-420e9fc87f63', 'created', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', 'admin', 'admin', NULL, '{"name": "安溪鐵觀音", "stock": 2, "series_id": "2314ca50-c272-4449-98e9-5d9a702419bb", "retail_price": 450, "stock_status": "sufficient"}', NULL, '2026-01-09 07:26:02.044288+00'),
	('963855eb-07eb-4c1f-9392-0db4aca570ce', 'product', '6fc567a8-9a58-42be-b07b-420e9fc87f63', 'deleted', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', 'admin', 'admin', '{"code": "DRK-TEA-01", "name": "安溪鐵觀音", "stock": 2, "series_id": "2314ca50-c272-4449-98e9-5d9a702419bb", "retail_price": 450}', NULL, '硬刪除商品', '2026-01-09 07:51:29.454521+00'),
	('3ccec982-61fd-4a05-be71-8860ccefee0d', 'product', '1539895f-9d99-4d39-ab26-cb9a6328afb5', 'created', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', 'admin', 'admin', NULL, '{"name": "VG甘油", "stock": 3, "series_id": "2314ca50-c272-4449-98e9-5d9a702419bb", "retail_price": 500, "stock_status": "sufficient"}', NULL, '2026-01-09 08:03:40.548614+00');


--
-- Data for Name: backup_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."backup_jobs" ("id", "filename", "file_size", "storage_provider", "storage_url", "backup_type", "status", "metadata", "error_message", "created_by", "started_at", "completed_at", "created_at", "includes_storage") VALUES
	('74c873d7-71a2-4596-b07a-bf2f0c828fef', 'vsale-backup-20260109-074614.sql.gz', 16215, 'gcs', 'gs://vsale-backups-haraluya/vsale-backup-20260109-074614.sql.gz', 'manual', 'success', '{"rows": 35, "tables": 19, "duration_ms": 37245, "table_stats": {"tiers": {"rows": 3, "size_bytes": 0}, "orders": {"rows": 1, "size_bytes": 0}, "series": {"rows": 1, "size_bytes": 0}, "coupons": {"rows": 1, "size_bytes": 0}, "products": {"rows": 1, "size_bytes": 0}, "profiles": {"rows": 2, "size_bytes": 0}, "audit_logs": {"rows": 2, "size_bytes": 0}, "categories": {"rows": 3, "size_bytes": 0}, "backup_jobs": {"rows": 2, "size_bytes": 0}, "order_items": {"rows": 1, "size_bytes": 0}, "tier_prices": {"rows": 1, "size_bytes": 0}, "user_coupons": {"rows": 2, "size_bytes": 0}, "order_coupons": {"rows": 1, "size_bytes": 0}, "order_timelines": {"rows": 1, "size_bytes": 0}, "system_settings": {"rows": 13, "size_bytes": 0}, "order_custom_fees": {"rows": 0, "size_bytes": 0}, "coupon_tier_restrictions": {"rows": 0, "size_bytes": 0}, "coupon_series_restrictions": {"rows": 0, "size_bytes": 0}}, "original_size": 98976, "compressed_size": 16215, "compression_ratio": 0.16}', NULL, 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', '2026-01-09 07:46:15.225408+00', '2026-01-09 07:46:55.954+00', '2026-01-09 07:46:15.225408+00', false),
	('61179aac-4d7c-40ae-8acc-fc6a3da6187d', 'vsale-backup-20260109-080442.sql.gz', 0, 'gcs', '', 'manual', 'in_progress', NULL, NULL, 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', '2026-01-09 08:04:43.656675+00', NULL, '2026-01-09 08:04:43.656675+00', false),
	('b435a2e8-7144-41fa-a2af-663c0e008a81', 'vsale-backup-20260109-081946.sql.gz', 0, 'gcs', '', 'manual', 'failed', NULL, '資料庫備份失敗。請確保已安裝 PostgreSQL 客戶端工具或 Supabase CLI 設定正確。
錯誤訊息: Command failed: pg_dump -h db.qwovavytryvgchcowjof.supabase.co -p 5432 -U postgres -d postgres -F p --data-only --exclude-schema=storage --no-owner --no-acl -f "C:\Users\haral\AppData\Local\Temp\vsale-backup-20260109-081946.sql"
''pg_dump'' ���O�����Υ~���R�O�B�i���檺�{���Χ妸�ɡC


解決方案：
1. 安裝 PostgreSQL: https://www.postgresql.org/download/windows/
2. 或確保 Supabase CLI 已正確連線到遠端專案 (supabase link)', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', '2026-01-09 08:19:47.506894+00', '2026-01-09 08:19:47.508+00', '2026-01-09 08:19:47.506894+00', false),
	('7681a863-f71c-4e1d-abd8-428310486b58', 'vsale-backup-20260109-081952.sql.gz', 0, 'gcs', '', 'manual', 'failed', NULL, '資料庫備份失敗。請確保已安裝 PostgreSQL 客戶端工具或 Supabase CLI 設定正確。
錯誤訊息: Command failed: pg_dump -h db.qwovavytryvgchcowjof.supabase.co -p 5432 -U postgres -d postgres -F p --data-only --exclude-schema=storage --no-owner --no-acl -f "C:\Users\haral\AppData\Local\Temp\vsale-backup-20260109-081952.sql"
''pg_dump'' ���O�����Υ~���R�O�B�i���檺�{���Χ妸�ɡC


解決方案：
1. 安裝 PostgreSQL: https://www.postgresql.org/download/windows/
2. 或確保 Supabase CLI 已正確連線到遠端專案 (supabase link)', 'bc70fad5-3da9-408e-b43e-4b9c31ef662a', '2026-01-09 08:19:53.650541+00', '2026-01-09 08:19:53.285+00', '2026-01-09 08:19:53.650541+00', false);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."categories" ("id", "code", "name", "description", "status", "sort_order", "created_at", "updated_at") VALUES
	('01899ced-3299-4dbd-96ab-f13d53feace5', 'DRK', '飲料', '各式飲料商品', 'active', 1, '2026-01-09 00:16:29.684162+00', '2026-01-09 00:16:34.44533+00'),
	('d3979ba3-1b2d-432b-9c4d-7a73363c9f86', 'SNK', '零食', '零食與點心', 'active', 2, '2026-01-09 00:16:29.684162+00', '2026-01-09 00:16:34.44533+00'),
	('05c4d72d-ec34-4f8f-bc07-e3033f83d1d8', 'DAI', '日用品', '日常用品', 'active', 3, '2026-01-09 00:16:29.684162+00', '2026-01-09 00:16:34.44533+00');


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."coupons" ("id", "code", "discount_type", "discount_value", "min_order_amount", "valid_from", "valid_until", "claim_limit", "status", "deleted_at", "created_at", "updated_at") VALUES
	('c849db37-4af3-4ecc-b58b-5262339c8dfe', 'TEST100', 'percentage', 10.00, NULL, '2026-01-08 23:27:00+00', '2026-02-07 23:27:00+00', 2, 'active', NULL, '2026-01-09 07:27:20.3294+00', '2026-01-09 07:27:20.3294+00');


--
-- Data for Name: series; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."series" ("id", "category_id", "code", "name", "description", "image_url", "status", "sort_order", "created_at", "updated_at") VALUES
	('2314ca50-c272-4449-98e9-5d9a702419bb', '01899ced-3299-4dbd-96ab-f13d53feace5', 'TEA', '小茶山', NULL, NULL, 'active', 0, '2026-01-09 07:25:41.164782+00', '2026-01-09 07:25:41.164782+00');


--
-- Data for Name: coupon_series_restrictions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tiers" ("id", "name", "rank", "created_at", "updated_at", "is_protected", "shipping_fee", "free_shipping_threshold") VALUES
	('4d420d5a-6f49-4d8a-a723-2d09fe7194d7', '批發', 1, '2026-01-09 00:16:29.071282+00', '2026-01-09 00:16:34.44533+00', false, 0.00, NULL),
	('e6b7cb92-8353-44b2-afdc-78e205f562fe', '零售', 2, '2026-01-09 00:16:29.071282+00', '2026-01-09 00:16:34.44533+00', true, 0.00, NULL),
	('f07b301d-fe91-4078-8105-51dd8980daf3', '經銷商', 3, '2026-01-09 00:16:29.071282+00', '2026-01-09 00:16:34.44533+00', false, 0.00, NULL);


--
-- Data for Name: coupon_tier_restrictions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."orders" ("id", "order_number", "user_id", "total_amount", "status", "notes", "created_at", "updated_at", "shipping_fee") VALUES
	('4186a686-7612-4bfe-b8b0-eb4ac2af2e19', 'ORD-20260109-0001', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 450.00, 'pending', NULL, '2026-01-09 08:04:29.133762+00', '2026-01-09 08:04:29.133762+00', 0.00);


--
-- Data for Name: order_coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."order_coupons" ("id", "order_id", "coupon_code", "discount_type", "discount_value", "discount_amount", "created_at") VALUES
	('7938327a-4c17-4700-841b-6b13924d973a', '4186a686-7612-4bfe-b8b0-eb4ac2af2e19', 'TEST100', 'percentage', 10.00, 50.00, '2026-01-09 08:04:29.439865+00');


--
-- Data for Name: order_custom_fees; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."products" ("id", "code", "name", "series_id", "description", "retail_price", "stock", "stock_status", "unit", "image_url", "tags", "status", "created_at", "updated_at") VALUES
	('1539895f-9d99-4d39-ab26-cb9a6328afb5', 'DRK-TEA-01', 'VG甘油', '2314ca50-c272-4449-98e9-5d9a702419bb', NULL, 500.00, 3, 'sufficient', '件', NULL, '{}', 'active', '2026-01-09 08:03:39.579449+00', '2026-01-09 08:03:39.579449+00');


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."order_items" ("id", "order_id", "product_id", "product_name_snapshot", "deal_price", "quantity", "subtotal", "created_at", "series_id_snapshot") VALUES
	('5b35181c-77f5-4aa8-8392-a76c9d5fc1aa', '4186a686-7612-4bfe-b8b0-eb4ac2af2e19', '1539895f-9d99-4d39-ab26-cb9a6328afb5', 'VG甘油', 500.00, 1, 500.00, '2026-01-09 08:04:29.288248+00', '2314ca50-c272-4449-98e9-5d9a702419bb');


--
-- Data for Name: order_timelines; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."order_timelines" ("id", "order_id", "action_type", "actor_id", "actor_role", "old_status", "new_status", "notes", "created_at", "modifications") VALUES
	('7f7f6c90-8afd-4f4b-bb38-77bace884138', '4186a686-7612-4bfe-b8b0-eb4ac2af2e19', 'created', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 'client', NULL, 'pending', NULL, '2026-01-09 08:04:29.747758+00', NULL);


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "phone", "email", "role", "tier_id", "created_at", "display_name", "notes", "username", "address", "admin_notes") VALUES
	('bc70fad5-3da9-408e-b43e-4b9c31ef662a', NULL, 'admin@example.com', 'admin', NULL, '2026-01-09 00:16:34.44533+00', '系統管理員', NULL, 'admin', NULL, NULL),
	('ccb907fc-4cc5-4b7d-90d5-2e41325bf592', '0988597052', NULL, 'client', 'e6b7cb92-8353-44b2-afdc-78e205f562fe', '2026-01-09 07:25:04.892954+00', '哈雷', NULL, NULL, NULL, NULL);


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_settings" ("id", "key", "value", "value_type", "category", "is_public", "description", "updated_by", "created_at", "updated_at") VALUES
	('ba5e5980-caab-409c-9859-b274155c5047', 'site_title', 'Vsale-lite - B2B 批發訂貨系統', 'text', 'general', true, '網站標題', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('8470cdb3-7fd9-4456-9893-831e37a9e08f', 'company_name', '您的公司名稱', 'text', 'general', true, '公司名稱', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('beaea59c-3ba9-454d-96d0-89fd24c0e837', 'logo_url', '', 'image_url', 'branding', true, '完整版 Logo（200×60）', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('988754a0-7375-4548-a989-153e7b137086', 'logo_icon_url', '', 'image_url', 'branding', true, '圖示版 Logo（60×60）', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('74ff5b69-4125-4ea9-83ae-4786317f64c2', 'favicon_url', '', 'image_url', 'branding', true, 'Favicon（60×60）', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('f1d14dd6-8e0b-45d4-9930-8ce999a36be2', 'carousel_auto_play', 'true', 'boolean', 'carousel', true, '廣告輪播顯示開關（開啟=顯示，關閉=隱藏）', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('e5dc61d3-b3b2-4b86-b48d-d47cad8ef00a', 'carousel_interval', '5000', 'number', 'carousel', true, '廣告輪播間隔（毫秒）', NULL, '2026-01-09 00:16:31.412931+00', '2026-01-09 00:16:31.412931+00'),
	('62c3fdfa-ff56-47b4-968b-b96f45048b95', 'backup_enabled', 'true', 'boolean', 'system', false, '自動備份開關', NULL, '2026-01-09 04:31:14.002949+00', '2026-01-09 04:31:14.002949+00'),
	('b37c02bb-e009-4589-a047-27f2df661f86', 'backup_max_keep', '10', 'number', 'system', false, '保留備份數量', NULL, '2026-01-09 04:31:14.002949+00', '2026-01-09 04:31:14.002949+00'),
	('85028271-56c3-4764-b19c-a5088e3047ad', 'backup_storage_provider', 'gcs', 'text', 'system', false, '儲存位置', NULL, '2026-01-09 04:31:14.002949+00', '2026-01-09 04:31:14.002949+00'),
	('d3b971fb-5984-40f5-bf2b-099252f36c06', 'backup_include_storage_default', 'false', 'boolean', 'system', false, '備份時預設是否包含 Supabase Storage 圖片', NULL, '2026-01-09 06:40:17.223144+00', '2026-01-09 06:40:17.223144+00'),
	('60bc6b29-ac61-4252-885b-915b19d639a6', 'backup_last_success', '2026-01-09T07:46:56.126Z', 'text', 'system', false, '上次成功時間', NULL, '2026-01-09 04:31:14.002949+00', '2026-01-09 07:46:56.784408+00'),
	('108ebfb3-bc6b-48ab-83be-29bd21f914c2', 'backup_last_error', '資料庫備份失敗。請確保已安裝 PostgreSQL 客戶端工具或 Supabase CLI 設定正確。
錯誤訊息: Command failed: pg_dump -h db.qwovavytryvgchcowjof.supabase.co -p 5432 -U postgres -d postgres -F p --data-only --exclude-schema=storage --no-owner --no-acl -f "C:\Users\haral\AppData\Local\Temp\vsale-backup-20260109-081952.sql"
''pg_dump'' ���O�����Υ~���R�O�B�i���檺�{���Χ妸�ɡC


解決方案：
1. 安裝 PostgreSQL: https://www.postgresql.org/download/windows/
2. 或確保 Supabase CLI 已正確連線到遠端專案 (supabase link)', 'text', 'system', false, '上次錯誤訊息', NULL, '2026-01-09 04:31:14.002949+00', '2026-01-09 08:19:54.157103+00');


--
-- Data for Name: tier_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tier_prices" ("id", "tier_id", "product_id", "price", "created_at", "updated_at") VALUES
	('3ef0fbd9-d9f4-418a-a61e-3b528ed58a24', 'e6b7cb92-8353-44b2-afdc-78e205f562fe', '1539895f-9d99-4d39-ab26-cb9a6328afb5', 500.00, '2026-01-09 08:03:39.908479+00', '2026-01-09 08:03:39.908479+00');


--
-- Data for Name: user_coupons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_coupons" ("id", "user_id", "coupon_id", "claimed_at", "used_at", "order_id") VALUES
	('00532222-7768-4aa3-a3d9-1f99c804b93f', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 'c849db37-4af3-4ecc-b58b-5262339c8dfe', '2026-01-09 07:27:29.644454+00', NULL, NULL),
	('eed00b96-bb5b-4e14-8c92-21cb5d0df2f7', 'ccb907fc-4cc5-4b7d-90d5-2e41325bf592', 'c849db37-4af3-4ecc-b58b-5262339c8dfe', '2026-01-09 07:27:29.644454+00', NULL, NULL);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 53, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict ykFBhAidCMMJtZwbmho7cVGsK3wZmxeyKPC7orPplL9zPeAS2p6f2aXo93ToBHm

RESET ALL;
