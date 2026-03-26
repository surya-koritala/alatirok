package repository_test

import (
	"context"
	"testing"

	"github.com/surya-koritala/alatirok/internal/database"
	"github.com/surya-koritala/alatirok/internal/models"
	"github.com/surya-koritala/alatirok/internal/repository"
)

func TestCommentRepo_CreateTopLevel(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "votes", "comments", "posts", "communities", "participants")

	pRepo := repository.NewParticipantRepo(pool)
	cRepo := repository.NewCommunityRepo(pool)
	postRepo := repository.NewPostRepo(pool)
	commentRepo := repository.NewCommentRepo(pool)
	ctx := context.Background()

	owner := createTestOwner(t, pRepo, ctx, "comment-toplevel")
	community := createTestCommunity(t, cRepo, ctx, owner.ID, "comment-toplevel")
	post := createTestPost(t, postRepo, ctx, community.ID, owner.ID, "Top Level Comment Post")

	comment := &models.Comment{
		PostID:     post.ID,
		AuthorID:   owner.ID,
		AuthorType: models.ParticipantHuman,
		Body:       "This is a top-level comment",
	}

	created, err := commentRepo.Create(ctx, comment)
	if err != nil {
		t.Fatalf("Create top-level comment: %v", err)
	}

	if created.ID == "" {
		t.Error("expected non-empty comment ID")
	}
	if created.Depth != 0 {
		t.Errorf("expected depth 0 for top-level comment, got %d", created.Depth)
	}
	if created.ParentCommentID != nil {
		t.Errorf("expected nil ParentCommentID, got %v", created.ParentCommentID)
	}
	if created.Body != "This is a top-level comment" {
		t.Errorf("expected body 'This is a top-level comment', got %q", created.Body)
	}

	// Verify post comment_count was incremented
	updated, err := postRepo.GetByID(ctx, post.ID)
	if err != nil {
		t.Fatalf("GetByID post: %v", err)
	}
	if updated.CommentCount != 1 {
		t.Errorf("expected comment_count 1 after comment creation, got %d", updated.CommentCount)
	}
}

func TestCommentRepo_CreateNested(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "votes", "comments", "posts", "communities", "participants")

	pRepo := repository.NewParticipantRepo(pool)
	cRepo := repository.NewCommunityRepo(pool)
	postRepo := repository.NewPostRepo(pool)
	commentRepo := repository.NewCommentRepo(pool)
	ctx := context.Background()

	owner := createTestOwner(t, pRepo, ctx, "comment-nested")
	community := createTestCommunity(t, cRepo, ctx, owner.ID, "comment-nested")
	post := createTestPost(t, postRepo, ctx, community.ID, owner.ID, "Nested Comment Post")

	// Create parent comment
	parent := &models.Comment{
		PostID:     post.ID,
		AuthorID:   owner.ID,
		AuthorType: models.ParticipantHuman,
		Body:       "Parent comment",
	}
	parentCreated, err := commentRepo.Create(ctx, parent)
	if err != nil {
		t.Fatalf("Create parent comment: %v", err)
	}
	if parentCreated.Depth != 0 {
		t.Errorf("expected parent depth 0, got %d", parentCreated.Depth)
	}

	// Create reply to parent
	reply := &models.Comment{
		PostID:          post.ID,
		ParentCommentID: &parentCreated.ID,
		AuthorID:        owner.ID,
		AuthorType:      models.ParticipantHuman,
		Body:            "Reply to parent",
	}
	replyCreated, err := commentRepo.Create(ctx, reply)
	if err != nil {
		t.Fatalf("Create nested comment: %v", err)
	}

	if replyCreated.Depth != 1 {
		t.Errorf("expected reply depth 1, got %d", replyCreated.Depth)
	}
	if replyCreated.ParentCommentID == nil {
		t.Error("expected non-nil ParentCommentID for nested comment")
	} else if *replyCreated.ParentCommentID != parentCreated.ID {
		t.Errorf("expected ParentCommentID %q, got %q", parentCreated.ID, *replyCreated.ParentCommentID)
	}
}

func TestCommentRepo_ListByPost(t *testing.T) {
	pool := database.TestPool(t)
	database.CleanupTables(t, pool, "votes", "comments", "posts", "communities", "participants")

	pRepo := repository.NewParticipantRepo(pool)
	cRepo := repository.NewCommunityRepo(pool)
	postRepo := repository.NewPostRepo(pool)
	commentRepo := repository.NewCommentRepo(pool)
	ctx := context.Background()

	owner := createTestOwner(t, pRepo, ctx, "comment-list")
	community := createTestCommunity(t, cRepo, ctx, owner.ID, "comment-list")
	post := createTestPost(t, postRepo, ctx, community.ID, owner.ID, "List Comments Post")

	// Create two top-level comments
	c1, err := commentRepo.Create(ctx, &models.Comment{
		PostID:     post.ID,
		AuthorID:   owner.ID,
		AuthorType: models.ParticipantHuman,
		Body:       "First comment",
	})
	if err != nil {
		t.Fatalf("Create comment 1: %v", err)
	}

	_, err = commentRepo.Create(ctx, &models.Comment{
		PostID:     post.ID,
		AuthorID:   owner.ID,
		AuthorType: models.ParticipantHuman,
		Body:       "Second comment",
	})
	if err != nil {
		t.Fatalf("Create comment 2: %v", err)
	}

	// Create a nested reply under the first comment
	_, err = commentRepo.Create(ctx, &models.Comment{
		PostID:          post.ID,
		ParentCommentID: &c1.ID,
		AuthorID:        owner.ID,
		AuthorType:      models.ParticipantHuman,
		Body:            "Reply to first",
	})
	if err != nil {
		t.Fatalf("Create reply: %v", err)
	}

	comments, err := commentRepo.ListByPost(ctx, post.ID, "best", 10, 0)
	if err != nil {
		t.Fatalf("ListByPost: %v", err)
	}

	if len(comments) != 3 {
		t.Fatalf("expected 3 comments, got %d", len(comments))
	}

	// Verify threaded ordering: depth 0 comments come before depth 1
	if comments[0].Depth != 0 {
		t.Errorf("expected first comment depth 0, got %d", comments[0].Depth)
	}
	if comments[1].Depth != 0 {
		t.Errorf("expected second comment depth 0, got %d", comments[1].Depth)
	}
	if comments[2].Depth != 1 {
		t.Errorf("expected third comment depth 1, got %d", comments[2].Depth)
	}

	// Verify author is populated
	for i, c := range comments {
		if c.Author.ID == "" {
			t.Errorf("comment[%d] has empty Author.ID", i)
		}
		if c.Author.DisplayName == "" {
			t.Errorf("comment[%d] has empty Author.DisplayName", i)
		}
	}
}
