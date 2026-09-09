from app.services.detection import check_code_format


def test_valid_product_code():
    result = check_code_format("TT-TEST01")

    assert result is None


def test_invalid_product_code():
    result = check_code_format("INVALID")

    assert result is not None
    assert "invalid product code" in result.lower()
