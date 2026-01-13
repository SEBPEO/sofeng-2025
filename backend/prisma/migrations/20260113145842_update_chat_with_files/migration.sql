-- DropForeignKey
ALTER TABLE "public"."Chat" DROP CONSTRAINT "Chat_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Chat" DROP CONSTRAINT "Chat_sender_id_fkey";

-- AlterTable
CREATE SEQUENCE chat_message_id_seq;
ALTER TABLE "Chat" ADD COLUMN     "file_name" VARCHAR(255),
ADD COLUMN     "file_path" VARCHAR(500),
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "file_type" VARCHAR(100),
ALTER COLUMN "message_id" SET DEFAULT nextval('chat_message_id_seq'),
ALTER COLUMN "sent_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER SEQUENCE chat_message_id_seq OWNED BY "Chat"."message_id";

-- CreateIndex
CREATE INDEX "Chat_sender_id_receiver_id_idx" ON "Chat"("sender_id", "receiver_id");

-- CreateIndex
CREATE INDEX "Chat_receiver_id_idx" ON "Chat"("receiver_id");

-- CreateIndex
CREATE INDEX "Chat_sent_at_idx" ON "Chat"("sent_at");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
