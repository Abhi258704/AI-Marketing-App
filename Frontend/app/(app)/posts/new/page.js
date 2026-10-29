"use client";

import { useRouter } from "next/navigation";
import { RequireBusiness } from "@/components/layout/require-business";
import { PostForm } from "@/components/posts/post-form";
import { PageHeader } from "@/components/ui/card";

export default function NewPostPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader title="New post" description="Write a post, then save it as a draft, publish it now, or schedule it." />
      <RequireBusiness>
        {(business) => (
          <PostForm
            defaultBusinessId={business._id}
            onDone={(post) => router.push(`/posts/${post._id}`)}
            onCancel={() => router.push("/posts")}
          />
        )}
      </RequireBusiness>
    </>
  );
}
