CREATE OR REPLACE FUNCTION get_user_stats(user_id_param UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
SELECT json_build_object(
    'posts', (SELECT count(*) FROM posts WHERE user_id = user_id_param),
    'followers', (SELECT count(*) FROM follows WHERE following_id = user_id_param AND status = 'accepted'),
    'following', (SELECT count(*) FROM follows WHERE follower_id = user_id_param AND status = 'accepted')
);
$$;
